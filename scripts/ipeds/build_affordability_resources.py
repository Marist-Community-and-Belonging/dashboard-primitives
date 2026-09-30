#!/usr/bin/env python3
"""Build the dashboard-ready Affordability & Resources extract."""

from __future__ import annotations

import json
from pathlib import Path

try:
    from .build_common import run, write_dataset
    from .build_overview import aid_year, collection_start, load_institutions, number, summary
    from .source import IpedsSource
except ImportError:
    from build_common import run, write_dataset
    from build_overview import aid_year, collection_start, load_institutions, number, summary
    from source import IpedsSource


ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "data" / "config" / "affordability-resources-metrics.json"
SOURCE = IpedsSource()


def build(collection_year: str) -> dict[str, object]:
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    data_year = aid_year(collection_start(collection_year))
    institutions = load_institutions()
    release = next(item for item in SOURCE.manifest["releases"] if item["collection_year"] == collection_year)
    net_price = SOURCE.read_component(collection_year, str(config["net_price_component"]))
    aid = SOURCE.read_component(collection_year, str(config["aid_component"]))
    graduation = SOURCE.read_component(collection_year, str(config["graduation_component"]))
    records = []
    for unitid, institution in institutions.items():
        net_price_row = net_price.get(unitid, {})
        records.append({
            "unitid": unitid,
            "institution_name": institution["display_name"],
            "group": institution["group_name"],
            "average_net_price": number(net_price_row.get("NPGRN2")),
            "pell_share": number(aid.get(unitid, {}).get("UPGRNTP")),
            "graduation_rate": number(graduation.get(unitid, {}).get("GBA6RTT")),
            "income_net_prices": {
                str(band["band_id"]): number(net_price_row.get(str(band["variable"])))
                for band in config["income_bands"]
            },
        })

    headlines = []
    for metric in config["headlines"]:
        metric_id = str(metric["metric_id"])
        metric_records = [{"group": record["group"], "value": record[metric_id]} for record in records]
        marist = next(record for record in metric_records if record["group"] == "marist")
        headlines.append({
            **metric,
            "value": marist["value"],
            "data_year": data_year,
            "peer": summary(metric_records, "peer"),
            "aspirant": summary(metric_records, "aspirant"),
        })

    income_bands = []
    for band in config["income_bands"]:
        band_id = str(band["band_id"])
        band_records = [
            {"group": record["group"], "value": record["income_net_prices"][band_id]}
            for record in records
        ]
        marist = next(record for record in band_records if record["group"] == "marist")
        income_bands.append({
            **band,
            "marist": marist["value"],
            "peer": summary(band_records, "peer"),
            "aspirant": summary(band_records, "aspirant"),
        })

    return {
        "release": {
            "collection_year": collection_year,
            "release_type": release["release_type"],
            "retrieved_at": release["retrieved_at"],
            "source": release.get("source", SOURCE.manifest["source"]),
        },
        "institution_count": len(records),
        "data_year": data_year,
        "headlines": headlines,
        "income_bands": income_bands,
        "institutions": records,
        "methodology": {
            "net_price": "Average net price estimates annual cost of attendance after grants and scholarships for aided full-time, first-time students.",
            "income_bands": "Income-band values cover full-time, first-time students awarded Title IV federal financial aid. Peer and aspirant values are institution-level medians."
        }
    }


def write(collection_year: str) -> None:
    write_dataset("affordability-resources", collection_year, build)


if __name__ == "__main__":
    run(write, SOURCE.list_releases())
