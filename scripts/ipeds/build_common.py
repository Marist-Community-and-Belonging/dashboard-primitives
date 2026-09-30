"""Shared output and command-line handling for dataset builders."""

from __future__ import annotations

import argparse
import json
from collections.abc import Callable
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def write_dataset(name: str, collection_year: str, build: Callable[[str], dict[str, object]]) -> None:
    payload = json.dumps(build(collection_year), indent=2) + "\n"
    slug = collection_year.split("–", 1)[0]
    outputs = (
        ROOT / "data" / "processed" / f"{name}-{slug}.json",
        ROOT / "dashboard" / "web" / "data" / f"{name}-{slug}.json",
    )
    for output in outputs:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(payload, encoding="utf-8")
    print(outputs[0].relative_to(ROOT))


def run(writer: Callable[[str], None], releases: list[dict[str, str]]) -> None:
    years = [item["collection_year"] for item in releases]
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", choices=years)
    selected = parser.parse_args().year
    for year in [selected] if selected else years:
        writer(year)
