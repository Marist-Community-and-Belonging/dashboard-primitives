#!/usr/bin/env python3
"""Build the dashboard-ready Success & Equity extract."""

from __future__ import annotations

import json
import statistics
from pathlib import Path

try:
    from .build_common import run, write_dataset
    from .build_overview import collection_start, load_institutions, number, percentile
    from .source import IpedsSource
except ImportError:
    from build_common import run, write_dataset
    from build_overview import collection_start, load_institutions, number, percentile
    from source import IpedsSource


ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "data" / "config" / "success-equity-metrics.json"
SOURCE = IpedsSource()


def percentage(value: str | None) -> float | None:
    parsed = number(value)
    if parsed is not None and parsed > 100:
        raise ValueError(f"impossible percentage: {parsed}")
    return parsed


def summarize(values: list[float | None]) -> dict[str, float | int | None]:
    available = [float(value) for value in values if value is not None]
    return {
        "count": len(available),
        "mean": statistics.fmean(available) if available else None,
        "median": statistics.median(available) if available else None,
        "q1": percentile(available, 0.25),
        "q3": percentile(available, 0.75),
    }


def build(collection_year: str) -> dict[str, object]:
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    start_year = collection_start(collection_year)
    cohort_year = start_year - 6
    institutions = load_institutions()
    release = next(item for item in SOURCE.manifest["releases"] if item["collection_year"] == collection_year)
    components = {
        name: SOURCE.read_component(collection_year, name)
        for name in {str(item["component"]) for item in config["outcomes"]}
    }

    records = []
    for unitid, institution in institutions.items():
        outcome_values = {
            str(item["metric_id"]): percentage(components[str(item["component"])].get(unitid, {}).get(str(item["variable"])))
            for item in config["outcomes"]
        }
        graduation = components["GR_DERIVED"].get(unitid, {})
        subgroup_values = {
            str(item["subgroup_id"]): percentage(graduation.get(str(item["variable"])))
            for item in config["subgroups"]
        }
        records.append({
            "unitid": unitid,
            "institution_name": institution["display_name"],
            "group": institution["group_name"],
            "outcomes": outcome_values,
            "subgroups": subgroup_values,
        })

    marist = next(record for record in records if record["group"] == "marist")
    peers = [record for record in records if record["group"] == "peer"]
    aspirants = [record for record in records if record["group"] == "aspirant"]
    outcomes = []
    for item in config["outcomes"]:
        metric_id = str(item["metric_id"])
        rendered_item = dict(item)
        if metric_id == "retention":
            rendered_item["data_year"] = f"Fall {start_year}"
        else:
            rendered_item["data_year"] = f"{start_year} status year"
            rendered_item["cohort_year"] = f"{cohort_year} entering cohort"
            duration = "four" if metric_id == "four_year_graduation" else "six"
            subject = "Pell Grant recipients" if metric_id == "pell_six_year_graduation" else "Full-time, first-time bachelor’s students"
            rendered_item["description"] = f"{subject} in the {cohort_year} cohort completing within {duration} years"
        outcomes.append({
            **rendered_item,
            "value": marist["outcomes"][metric_id],
            "peer": summarize([record["outcomes"][metric_id] for record in peers]),
            "aspirant": summarize([record["outcomes"][metric_id] for record in aspirants]),
        })

    institution_rate = marist["outcomes"]["six_year_graduation"]
    subgroups = []
    for item in config["subgroups"]:
        subgroup_id = str(item["subgroup_id"])
        value = marist["subgroups"][subgroup_id]
        subgroups.append({
            **item,
            "value": value,
            "gap": value - institution_rate if value is not None and institution_rate is not None else None,
            "numerator": None,
            "denominator": None,
            "peer": summarize([record["subgroups"][subgroup_id] for record in peers]),
            "aspirant": summarize([record["subgroups"][subgroup_id] for record in aspirants]),
        })

    return {
        "release": {
            "collection_year": collection_year,
            "release_type": release["release_type"],
            "retrieved_at": release["retrieved_at"],
            "source": release.get("source", SOURCE.manifest["source"]),
        },
        "institution_count": len(records),
        "cohort_year": f"{cohort_year} entering cohort",
        "institution_rate": institution_rate,
        "outcomes": outcomes,
        "subgroups": subgroups,
        "institutions": records,
        "small_cohort_policy": {
            "minimum": config["small_cohort_minimum"],
            "counts_available": False,
            "message": "Subgroup rates are descriptive and are not ranked."
        }
    }


def write(collection_year: str) -> None:
    write_dataset("success-equity", collection_year, build)


if __name__ == "__main__":
    run(write, SOURCE.list_releases())
