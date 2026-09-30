"""Validated local access to versioned IPEDS source files."""

from __future__ import annotations

import csv
import hashlib
import json
import zipfile
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = ROOT / "data" / "config" / "ipeds-releases.json"
DEFAULT_RAW_ROOT = ROOT / "data" / "raw"


@dataclass(frozen=True)
class SourceFile:
    path: Path
    label: str
    member: str | None = None


class IpedsSource:
    """Resolve local files from a checked-in release manifest."""

    def __init__(self, manifest_path: Path = DEFAULT_MANIFEST, raw_root: Path = DEFAULT_RAW_ROOT):
        self.raw_root = raw_root
        self.manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        self.releases = {release["collection_year"]: release for release in self.manifest["releases"]}
        self._verified: dict[tuple[str, str], SourceFile] = {}

    def list_releases(self) -> list[dict[str, str]]:
        return [
            {
                "collection_year": release["collection_year"],
                "release_type": release["release_type"],
                "retrieved_at": release["retrieved_at"],
            }
            for release in self.manifest["releases"]
        ]

    def fetch_component(self, year: str, component: str) -> SourceFile:
        release = self._release(year)
        definition = release["components"][component]
        return self._file(release, definition, definition["source_table"])

    def fetch_dictionary(self, year: str) -> dict[str, SourceFile]:
        release = self._release(year)
        return {"ACCESS": self._file(release, release["dictionary"], "IPEDS Access metadata")}

    def fetch_bundle(self, year: str) -> SourceFile:
        release = self._release(year)
        return self._file(release, release["bundle"], "IPEDS Access database")

    def read_component(self, year: str, component: str) -> dict[int, dict[str, str]]:
        source = self.fetch_component(year, component)
        with source.path.open(newline="", encoding="utf-8-sig") as stream:
            rows = csv.DictReader(stream)
            unitid_column = next(column for column in rows.fieldnames or [] if column.lower() == "unitid")
            return {int(row[unitid_column]): row for row in rows}

    def fetch_institutions(self, unitids: set[int], year: str | None = None) -> dict[int, dict[str, str]]:
        collection_year = year or self.manifest["releases"][-1]["collection_year"]
        directory = self.read_component(collection_year, "HD")
        institutions = {unitid: directory[unitid] for unitid in unitids if unitid in directory}
        missing = unitids - institutions.keys()
        if missing:
            raise ValueError(f"UNITIDs missing from {collection_year} HD: {sorted(missing)}")
        return institutions

    def _release(self, year: str) -> dict[str, object]:
        try:
            return self.releases[year]
        except KeyError as error:
            raise KeyError(f"unknown collection year: {year}") from error

    def _file(self, release: dict[str, object], definition: dict[str, str], label: str) -> SourceFile:
        path = self.raw_root / str(release["directory"]) / definition["path"]
        member = definition.get("member")
        cache_key = (str(path), member or "")
        if cache_key in self._verified:
            return self._verified[cache_key]
        if not path.is_file():
            raise FileNotFoundError(f"missing IPEDS source file: {path}")
        with path.open("rb") as binary:
            digest = hashlib.file_digest(binary, "sha256").hexdigest()
        if digest != definition["sha256"]:
            raise ValueError(f"checksum mismatch: {path}")
        if member:
            with zipfile.ZipFile(path) as archive:
                if member not in archive.namelist():
                    raise ValueError(f"missing {member} in {path}")
        source = SourceFile(path, label, member)
        self._verified[cache_key] = source
        return source
