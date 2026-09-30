#!/usr/bin/env python3
"""Download one final IPEDS collection and rebuild every public dataset.

The downloader uses official NCES Complete Data File archives. Newer releases
use published derived files. For 2019 and 2020, where those derived archives
are not published, the script calculates the same dashboard fields from the
final raw ADM, EF, and GR files.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import math
import re
import shutil
import tempfile
import urllib.error
import urllib.request
import zipfile
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
RAW_ROOT = ROOT / "data" / "raw"
MANIFEST = ROOT / "data" / "config" / "ipeds-releases.json"
BASE_URL = "https://nces.ed.gov/ipeds/datacenter/data"
RELEASE_URL = "https://nces.ed.gov/ipeds/use-the-data/download-access-database"
USER_AGENT = "Marist-IPEDS-Benchmark/1.0 (public-data-refresh)"


def digest(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def download_archive(name: str, destination: Path) -> tuple[Path, str]:
    destination.mkdir(parents=True, exist_ok=True)
    target = destination / f"{name}.zip"
    url = f"{BASE_URL}/{name}.zip"
    if not target.exists():
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=90) as response, tempfile.NamedTemporaryFile(dir=destination, delete=False) as temporary:
                shutil.copyfileobj(response, temporary)
                temporary_path = Path(temporary.name)
            temporary_path.replace(target)
        except urllib.error.HTTPError:
            if "temporary_path" in locals():
                temporary_path.unlink(missing_ok=True)
            raise
    return target, url


def verify_final_release(start_year: int) -> str:
    label = f"{start_year}-{str(start_year + 1)[-2:]}"
    request = urllib.request.Request(RELEASE_URL, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        page = response.read().decode("utf-8", errors="replace")
    row = re.search(rf">{re.escape(label)} Access</a>.*?</tr>", page, flags=re.DOTALL | re.IGNORECASE)
    if not row:
        raise ValueError(f"{label} is not listed on the official IPEDS Access release page")
    cells = [re.sub(r"<.*?>", "", cell).strip() for cell in re.findall(r"<td[^>]*>(.*?)</td>", row.group(0), flags=re.DOTALL | re.IGNORECASE)]
    status_index = next((index for index, cell in enumerate(cells) if cell.lower() in {"final", "provisional"}), None)
    if status_index is None or cells[status_index].lower() != "final":
        status = cells[status_index] if status_index is not None else "unknown"
        raise ValueError(f"{label} is listed as {status}, not final")
    release_date = cells[status_index + 1] if status_index + 1 < len(cells) else ""
    if not release_date:
        raise ValueError(f"{label} final release date is missing from the official IPEDS Access release page")
    return " ".join(release_date.split())


def csv_member(archive: Path) -> str:
    with zipfile.ZipFile(archive) as bundle:
        members = [name for name in bundle.namelist() if name.lower().endswith(".csv")]
        revised = [name for name in members if name.lower().endswith("_rv.csv")]
        if revised:
            return revised[0]
        if len(members) != 1:
            raise ValueError(f"cannot choose final CSV member in {archive}: {members}")
        return members[0]


def extract_csv(archive: Path, target: Path) -> str:
    member = csv_member(archive)
    target.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive) as bundle, bundle.open(member) as source, target.open("wb") as output:
        shutil.copyfileobj(source, output)
    return member


def read_csv(archive: Path) -> list[dict[str, str]]:
    member = csv_member(archive)
    with zipfile.ZipFile(archive) as bundle, bundle.open(member) as source:
        stream = io.TextIOWrapper(source, encoding="utf-8-sig", newline="")
        return [{key.strip(): value.strip() for key, value in row.items()} for row in csv.DictReader(stream)]


def value(row: dict[str, str], key: str) -> float | None:
    raw = row.get(key, "").strip()
    if raw in {"", "."}:
        return None
    parsed = float(raw)
    return None if parsed < 0 else parsed


def rounded_rate(numerator: float | None, denominator: float | None) -> int | None:
    if numerator is None or denominator is None or denominator <= 0:
        return None
    return math.floor((numerator / denominator * 100) + 0.5)


def write_rows(path: Path, fieldnames: list[str], rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def normalize_admissions(rows: list[dict[str, str]], target: Path) -> None:
    output = []
    for row in rows:
        output.append({
            "UNITID": row["UNITID"],
            "DVADM01": rounded_rate(value(row, "ADMSSN"), value(row, "APPLCN")),
        })
    write_rows(target, ["UNITID", "DVADM01"], output)


RACE_COUNTS = {
    "PCUENRAN": "EFAIANT",
    "PCUENRAS": "EFASIAT",
    "PCUENRBK": "EFBKAAT",
    "PCUENRHS": "EFHISPT",
    "PCUENRNH": "EFNHPIT",
    "PCUENRWH": "EFWHITT",
    "PCUENR2M": "EF2MORT",
    "PCUENRUN": "EFUNKNT",
    "PCUENRNR": "EFNRALT",
}


def normalize_enrollment(rows: list[dict[str, str]], target: Path) -> None:
    output = []
    for row in rows:
        if row.get("EFALEVEL", "").strip() != "2":
            continue
        total = value(row, "EFTOTLT")
        normalized: dict[str, object] = {"UNITID": row["UNITID"], "EFUG": total}
        normalized["PCUENRW"] = rounded_rate(value(row, "EFTOTLW"), total)
        for output_name, source_name in RACE_COUNTS.items():
            normalized[output_name] = rounded_rate(value(row, source_name), total)
        output.append(normalized)
    write_rows(target, ["UNITID", "EFUG", "PCUENRW", *RACE_COUNTS], output)


GRADUATION_COUNTS = {
    "GBA6RTT": "GRTOTLT",
    "GBA6RTM": "GRTOTLM",
    "GBA6RTW": "GRTOTLW",
    "GBA6RTAN": "GRAIANT",
    "GBA6RTAS": "GRASIAT",
    "GBA6RTNH": "GRNHPIT",
    "GBA6RTBK": "GRBKAAT",
    "GBA6RTHS": "GRHISPT",
    "GBA6RTWH": "GRWHITT",
    "GBA6RT2M": "GR2MORT",
    "GBA6RTUN": "GRUNKNT",
    "GBA6RTNR": "GRNRALT",
}


def normalize_graduation(graduation_rows: list[dict[str, str]], aid_rows: list[dict[str, str]], target: Path) -> None:
    by_institution: dict[str, dict[str, dict[str, str]]] = {}
    for row in graduation_rows:
        grtype = row.get("GRTYPE", "").strip()
        if grtype in {"8", "12", "13"}:
            by_institution.setdefault(row["UNITID"], {})[grtype] = row

    aid_by_institution: dict[str, dict[str, str]] = {}
    for row in aid_rows:
        if row.get("PSGRTYPE", "").strip() == "1" or row["UNITID"] not in aid_by_institution:
            aid_by_institution[row["UNITID"]] = row

    fieldnames = ["UNITID", "GBA4RTT", *GRADUATION_COUNTS, "PGBA6RT", "SSBA6RT", "NRBA6RT"]
    output = []
    for unitid, stages in by_institution.items():
        denominator = stages.get("8", {})
        six_year = stages.get("12", {})
        four_year = stages.get("13", {})
        normalized: dict[str, object] = {
            "UNITID": unitid,
            "GBA4RTT": rounded_rate(value(four_year, "GRTOTLT"), value(denominator, "GRTOTLT")),
        }
        for output_name, source_name in GRADUATION_COUNTS.items():
            normalized[output_name] = rounded_rate(value(six_year, source_name), value(denominator, source_name))
        aid = aid_by_institution.get(unitid, {})
        normalized.update({
            "PGBA6RT": rounded_rate(value(aid, "PGCMBAC"), value(aid, "PGADJCT")),
            "SSBA6RT": rounded_rate(value(aid, "SSCMBAC"), value(aid, "SSADJCT")),
            "NRBA6RT": rounded_rate(value(aid, "NRCMBAC"), value(aid, "NRADJCT")),
        })
        output.append(normalized)
    write_rows(target, fieldnames, output)


def component(path: Path, source_table: str) -> dict[str, str]:
    return {
        "path": str(path.relative_to(path.parents[1])),
        "source_table": source_table,
        "sha256": digest(path),
    }


def acquire(start_year: int, released_at: str | None = None) -> dict[str, object]:
    official_release_date = verify_final_release(start_year)
    collection_year = f"{start_year}\u2013{str(start_year + 1)[-2:]}"
    directory = RAW_ROOT / str(start_year)
    downloads = directory / "downloads"
    final = directory / "final"
    final.mkdir(parents=True, exist_ok=True)
    aid_span = f"{str(start_year - 1)[-2:]}{str(start_year)[-2:]}"
    archive_names = {
        "HD": f"HD{start_year}",
        "EF_RETENTION": f"EF{start_year}D",
        "SFA": f"SFA{aid_span}",
    }
    archives: dict[str, tuple[Path, str, str]] = {}

    for key, name in archive_names.items():
        archive, url = download_archive(name, downloads)
        archives[key] = (archive, url, csv_member(archive))

    derived_names = {
        "ADM_DERIVED": f"DRVADM{start_year}",
        "EF_DERIVED": f"DRVEF{start_year}",
        "GR_DERIVED": f"DRVGR{start_year}",
    }
    derived_available = True
    for key, name in derived_names.items():
        try:
            archive, url = download_archive(name, downloads)
            archives[key] = (archive, url, csv_member(archive))
        except urllib.error.HTTPError as error:
            if error.code != 404:
                raise
            derived_available = False
            break

    hd_path = final / f"HD{start_year}.csv"
    retention_path = final / f"EF{start_year}D.csv"
    sfa_path = final / f"SFA{aid_span}.csv"
    extract_csv(archives["HD"][0], hd_path)
    extract_csv(archives["EF_RETENTION"][0], retention_path)
    extract_csv(archives["SFA"][0], sfa_path)

    adm_path = final / f"DRVADM{start_year}.csv"
    enrollment_path = final / f"DRVEF{start_year}.csv"
    graduation_path = final / f"DRVGR{start_year}.csv"
    if derived_available:
        extract_csv(archives["ADM_DERIVED"][0], adm_path)
        extract_csv(archives["EF_DERIVED"][0], enrollment_path)
        extract_csv(archives["GR_DERIVED"][0], graduation_path)
    else:
        fallback_names = {
            "ADM_RAW": f"ADM{start_year}",
            "EF_RAW": f"EF{start_year}A",
            "GR_RAW": f"GR{start_year}",
            "GR_AID_RAW": f"GR{start_year}_PELL_SSL",
        }
        for key, name in fallback_names.items():
            archive, url = download_archive(name, downloads)
            archives[key] = (archive, url, csv_member(archive))
        normalize_admissions(read_csv(archives["ADM_RAW"][0]), adm_path)
        normalize_enrollment(read_csv(archives["EF_RAW"][0]), enrollment_path)
        normalize_graduation(read_csv(archives["GR_RAW"][0]), read_csv(archives["GR_AID_RAW"][0]), graduation_path)

    archive_manifest = {
        key: {"url": url, "path": str(path.relative_to(directory)), "member": member, "sha256": digest(path)}
        for key, (path, url, member) in sorted(archives.items())
    }
    return {
        "collection_year": collection_year,
        "directory": str(start_year),
        "release_type": "final",
        "released_at": released_at or official_release_date,
        "retrieved_at": date.today().isoformat(),
        "source": "NCES/IPEDS final Complete Data Files",
        "archives": archive_manifest,
        "components": {
            "ADM_DERIVED": component(adm_path, f"DRVADM{start_year}"),
            "EF_DERIVED": component(enrollment_path, f"DRVEF{start_year}"),
            "EF_RETENTION": component(retention_path, f"EF{start_year}D"),
            "GR_DERIVED": component(graduation_path, f"DRVGR{start_year}"),
            "SFA_AID": component(sfa_path, f"SFA{aid_span}"),
            "SFA_NET_PRICE": component(sfa_path, f"SFA{aid_span}"),
            "HD": component(hd_path, f"HD{start_year}"),
        },
    }


def update_manifest(release: dict[str, object]) -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    manifest["source"] = "NCES/IPEDS final data files"
    releases = [item for item in manifest["releases"] if item["collection_year"] != release["collection_year"]]
    releases.append(release)
    releases.sort(key=lambda item: item["collection_year"])
    manifest["releases"] = releases
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def rebuild(collection_year: str) -> None:
    from build_affordability_resources import write as write_affordability
    from build_diversity_access import write as write_diversity
    from build_overview import write as write_overview
    from build_success_equity import write as write_success

    for writer in (write_overview, write_diversity, write_success, write_affordability):
        writer(collection_year)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--year", type=int, required=True, help="collection start year, for example 2022 for 2022-23")
    parser.add_argument("--released-at", help="optional release-date override; the official page is always checked")
    arguments = parser.parse_args()
    release = acquire(arguments.year, arguments.released_at)
    update_manifest(release)
    rebuild(str(release["collection_year"]))
    print(f"Refreshed {release['collection_year']} final data")


if __name__ == "__main__":
    main()
