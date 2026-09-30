#!/usr/bin/env python3
"""Build the dashboard-ready overview extract from verified IPEDS files."""

from __future__ import annotations

import argparse
import csv
import json
import statistics
from pathlib import Path

try:
    from .source import IpedsSource
except ImportError:
    from source import IpedsSource


ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "data" / "config" / "institutions.csv"
METRIC_CONFIG = ROOT / "data" / "config" / "overview-metrics.json"
SOURCE = IpedsSource()


def load_institutions() -> dict[int, dict[str, str]]:
    with CONFIG.open(newline="", encoding="utf-8") as source:
        return {int(row["unitid"]): row for row in csv.DictReader(source)}


def load_metrics() -> list[dict[str, object]]:
    return json.loads(METRIC_CONFIG.read_text(encoding="utf-8"))["metrics"]


def number(value: str | None) -> float | None:
    if value is None or value.strip() in {"", "."}:
        return None
    parsed = float(value)
    return None if parsed < 0 else parsed


def percentile(values: list[float], fraction: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def summary(records: list[dict[str, object]], group: str) -> dict[str, float | int | None]:
    values = [float(record["value"]) for record in records if record["group"] == group and record["value"] is not None]
    return {
        "count": len(values),
        "median": statistics.median(values) if values else None,
        "q1": percentile(values, 0.25),
        "q3": percentile(values, 0.75),
    }


def collection_start(collection_year: str) -> int:
    return int(collection_year.split("–", 1)[0])


def aid_year(start_year: int) -> str:
    return f"{start_year - 1}–{str(start_year)[-2:]}"


def mapping_for(definition: dict[str, object], collection_year: str) -> dict[str, str]:
    configured = definition.get("releases", {}).get(collection_year)
    if configured:
        return configured
    start_year = collection_start(collection_year)
    defaults = {
        "undergraduate_enrollment": ("EF_DERIVED", "EFUG", f"Fall {start_year}"),
        "acceptance_rate": ("ADM_DERIVED", "DVADM01", f"Fall {start_year}"),
        "retention_rate": ("EF_RETENTION", "RET_PCF", f"Fall {start_year}"),
        "six_year_graduation_rate": ("GR_DERIVED", "GBA6RTT", f"{start_year} status year"),
        "average_net_price": ("SFA_NET_PRICE", "NPGRN2", aid_year(start_year)),
        "pell_share": ("SFA_AID", "UPGRNTP", aid_year(start_year)),
    }
    component_name, variable, data_year = defaults[str(definition["metric_id"])]
    mapping = {"component": component_name, "variable": variable, "data_year": data_year}
    if definition["metric_id"] == "six_year_graduation_rate":
        mapping["cohort_year"] = f"{start_year - 6} entering cohort"
    return mapping


def build(collection_year: str) -> dict[str, object]:
    start_year = collection_start(collection_year)
    institutions = load_institutions()
    release = next(item for item in SOURCE.manifest["releases"] if item["collection_year"] == collection_year)
    metrics = []

    for definition in load_metrics():
        mapping = mapping_for(definition, collection_year)
        component = SOURCE.read_component(collection_year, mapping["component"])
        records = []
        for unitid, institution in institutions.items():
            source = component.get(unitid, {})
            records.append(
                {
                    "unitid": unitid,
                    "institution_name": institution["display_name"],
                    "group": institution["group_name"],
                    "value": number(source.get(mapping["variable"])),
                    "status_flag": source.get(mapping.get("flag_variable")),
                }
            )

        marist = next(record for record in records if record["group"] == "marist")
        source_file = SOURCE.fetch_component(collection_year, mapping["component"])
        description = definition["description"]
        interpretation = definition["interpretation"]
        if definition["metric_id"] == "undergraduate_enrollment":
            description = f"Students enrolled for credit in fall {start_year}"
        if definition["metric_id"] == "six_year_graduation_rate":
            description = f"{start_year - 6} bachelor’s cohort completing by {start_year}"
            interpretation = "Full-time, first-time bachelor’s completion within six years."
        metrics.append(
            {
                "metric_id": definition["metric_id"],
                "display_name": definition["display_name"],
                "description": description,
                "interpretation": interpretation,
                "unit": definition["unit"],
                "favorable_direction": definition.get("favorable_direction"),
                "value": marist["value"],
                "data_year": mapping["data_year"],
                "collection_year": collection_year,
                "cohort_year": mapping.get("cohort_year"),
                "release_type": release["release_type"],
                "source_component": source_file.label,
                "source_variable": mapping["variable"],
                "status_flag": marist["status_flag"],
                "peer": summary(records, "peer"),
                "aspirant": summary(records, "aspirant"),
                "institutions": records,
            }
        )

    return {
        "release": {
            "collection_year": collection_year,
            "release_type": release["release_type"],
            "retrieved_at": release["retrieved_at"],
            "source": release.get("source", SOURCE.manifest["source"]),
        },
        "institution_count": len(institutions),
        "metrics": metrics,
    }


def write(collection_year: str) -> None:
    slug = str(collection_start(collection_year))
    output = ROOT / "data" / "processed" / f"overview-{slug}.json"
    public_output = ROOT / "dashboard" / "web" / "data" / f"overview-{slug}.json"
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
