#!/usr/bin/env python3
"""Build the dashboard-ready Diversity & Access extract."""

from __future__ import annotations

import argparse
import json
import statistics
from pathlib import Path

try:
    from .build_overview import collection_start, load_institutions, number
    from .source import IpedsSource
except ImportError:
    from build_overview import collection_start, load_institutions, number
    from source import IpedsSource


ROOT = Path(__file__).resolve().parents[2]
METRIC_CONFIG = ROOT / "data" / "config" / "diversity-access-metrics.json"
SOURCE = IpedsSource()


def load_config() -> dict[str, object]:
    return json.loads(METRIC_CONFIG.read_text(encoding="utf-8"))


def normalize_shares(shares: dict[str, float | None]) -> dict[str, float | None]:
    if any(value is None for value in shares.values()):
        return {key: None for key in shares}
    available = {key: value for key, value in shares.items() if value is not None}
    total = sum(available.values())
    if not available or total <= 0:
        return {key: None for key in shares}
    return {key: (value * 100 / total if value is not None else None) for key, value in shares.items()}


def percentage(value: str | None) -> float | None:
    parsed = number(value)
    if parsed is not None and parsed > 100:
        raise ValueError(f"impossible percentage: {parsed}")
    return parsed


def diversity_index(shares: dict[str, float | None]) -> float | None:
    normalized = normalize_shares(shares)
    values = [value / 100 for value in normalized.values() if value is not None]
    return 1 - sum(value**2 for value in values) if values else None


def weighted_share(records: list[dict[str, object]], key: str) -> float | None:
    usable = [record for record in records if record["enrollment"] is not None and record[key] is not None]
    if len(usable) != len(records):
        return None
    denominator = sum(float(record["enrollment"]) for record in usable)
    if denominator == 0:
        return None
    return sum(float(record["enrollment"]) * float(record[key]) for record in usable) / denominator


def median(records: list[dict[str, object]], key: str) -> float | None:
    values = [float(record[key]) for record in records if record[key] is not None]
    return statistics.median(values) if values else None


def build(collection_year: str) -> dict[str, object]:
    config = load_config()
    institutions = load_institutions()
    release = next(item for item in SOURCE.manifest["releases"] if item["collection_year"] == collection_year)
    enrollment = SOURCE.read_component(collection_year, str(config["composition_component"]))
    graduation = SOURCE.read_component(collection_year, str(config["graduation_component"]))
    pell = SOURCE.read_component(collection_year, str(config["pell_component"]))
    categories = list(config["categories"])

    records = []
    for unitid, institution in institutions.items():
        enrollment_row = enrollment.get(unitid, {})
        reported_shares = {
            str(category["category_id"]): percentage(enrollment_row.get(str(category["variable"])))
            for category in categories
        }
        normalized_shares = normalize_shares(reported_shares)
        women_share = percentage(enrollment_row.get(str(config["women_variable"])))
        record = {
            "unitid": unitid,
            "institution_name": institution["display_name"],
            "group": institution["group_name"],
            "enrollment": number(enrollment_row.get(str(config["enrollment_variable"]))),
            "women_share": women_share,
            "men_share": 100 - women_share if women_share is not None else None,
            "pell_share": percentage(pell.get(unitid, {}).get(str(config["pell_variable"]))),
            "graduation_rate": percentage(graduation.get(unitid, {}).get(str(config["graduation_variable"]))),
            "reported_shares": reported_shares,
            "normalized_shares": normalized_shares,
            "diversity_index": diversity_index(reported_shares),
        }
        record.update({f"share_{key}": value for key, value in reported_shares.items()})
        records.append(record)

    group_labels = {"marist": "Marist", "peer": "Peer aggregate", "aspirant": "Aspirant aggregate"}
    groups = []
    for group_name in ("marist", "peer", "aspirant"):
        members = [record for record in records if record["group"] == group_name]
        reported = {
            str(category["category_id"]): weighted_share(members, f"share_{category['category_id']}")
            for category in categories
        }
        groups.append(
            {
                "group": group_name,
                "display_name": group_labels[group_name],
                "institution_count": len(members),
                "enrollment": sum(float(record["enrollment"]) for record in members if record["enrollment"] is not None),
                "reported_shares": reported,
                "normalized_shares": normalize_shares(reported),
                "women_share": weighted_share(members, "women_share"),
                "men_share": weighted_share(members, "men_share"),
                "pell_share": weighted_share(members, "pell_share"),
            }
        )

    marist = next(record for record in records if record["group"] == "marist")
    gaps = []
    for category in categories:
        category_id = str(category["category_id"])
        marist_value = marist[f"share_{category_id}"]
        peer_median = median([record for record in records if record["group"] == "peer"], f"share_{category_id}")
        aspirant_median = median([record for record in records if record["group"] == "aspirant"], f"share_{category_id}")
        gaps.append(
            {
                "category_id": category_id,
                "display_name": category["display_name"],
                "marist": marist_value,
                "peer_median": peer_median,
                "aspirant_median": aspirant_median,
                "peer_gap": marist_value - peer_median if marist_value is not None and peer_median is not None else None,
                "aspirant_gap": marist_value - aspirant_median if marist_value is not None and aspirant_median is not None else None,
            }
        )

    return {
        "release": {
            "collection_year": collection_year,
            "release_type": release["release_type"],
            "retrieved_at": release["retrieved_at"],
            "source": release.get("source", SOURCE.manifest["source"]),
        },
        "institution_count": len(records),
        "data_year": f"Fall {collection_start(collection_year)}",
        "categories": categories,
        "groups": groups,
        "gaps": gaps,
        "institutions": records,
        "methodology": {
            "composition": "Institution shares use final IPEDS records and whole-percent presentation. Aggregate shares are enrollment-weighted; stacked-bar widths are normalized to 100% to absorb rounding.",
            "diversity_index": "One minus the sum of squared normalized category shares: the probability that two randomly selected undergraduates are reported in different IPEDS race/ethnicity categories."
        }
    }


def write(collection_year: str) -> None:
    slug = str(collection_start(collection_year))
    output = ROOT / "data" / "processed" / f"diversity-access-{slug}.json"
    public_output = ROOT / "dashboard" / "web" / "data" / f"diversity-access-{slug}.json"
    payload = json.dumps(build(collection_year), indent=2) + "\n"
    output.parent.mkdir(parents=True, exist_ok=True)
    public_output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(payload, encoding="utf-8")
    public_output.write_text(payload, encoding="utf-8")
    print(output.relative_to(ROOT))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", choices=[item["collection_year"] for item in SOURCE.list_releases()])
    arguments = parser.parse_args()
    years = [arguments.year] if arguments.year else [item["collection_year"] for item in SOURCE.list_releases()]
    for selected_year in years:
        write(selected_year)
