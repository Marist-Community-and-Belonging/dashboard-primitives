# Marist IPEDS Benchmark Dashboard

A public-facing dashboard comparing Marist University with its official peer and aspirant institutions using reproducible NCES/IPEDS data.

## Project status

The official data-access spike is complete, the 19-institution comparison set is verified against the 2023 IPEDS directory, and the Overview and Diversity & Access datasets are served by a Go/Gin application with an embedded D3 interface.

## Repository layout

- `dashboard/` — Go/Gin service and embedded static dashboard
- `data/config/` — checked-in institution and group configuration
- `data/raw/` — immutable official downloads, excluded from Git
- `data/processed/` — deterministic dashboard-ready outputs
- `docs/` — product brief, access findings, and methodology

See [docs/handoff.md](docs/handoff.md) for the product brief, [docs/ipeds-access.md](docs/ipeds-access.md) for the production data-source decision, [docs/architecture.md](docs/architecture.md) for the Go/D3 runtime design, and [docs/dashboard-design-system.md](docs/dashboard-design-system.md) for the reusable visual, interaction, data, and LLM implementation playbook.

## Local setup

Requirements: Go 1.22 or later and Python 3.11 or later.

```sh
cd dashboard
go mod download
go run .
```

The local dashboard is served at `http://localhost:8080/` by default. Set `DASHBOARD_ADDR` to use a different address.

## Data refresh

Place the official `IPEDS_2023-24_Final.zip` Access release in `data/raw/2023/`, then export these tables to `data/raw/2023/final/` as CSV:

- `DRVADM2023`
- `DRVEF2023`
- `EF2023D`
- `DRVGR2023`
- `sfa2223_p1`
- `sfa2223_p2`
- `HD2023`

Then rebuild the checked-in public extract:

```sh
python3 scripts/ipeds/build_overview.py
python3 scripts/ipeds/build_diversity_access.py
```

The scripts read the permanent institution keys in `data/config/institutions.csv`, write local analysis copies to `data/processed/`, and write embedded application copies to `dashboard/web/data/`.
Source paths, Access table names, checksums, release status, and HTTP provenance are versioned in `data/config/ipeds-releases.json`. Metric meanings and release-specific variable mappings live in `data/config/overview-metrics.json`. The build fails closed when a source file does not match the manifest.

## Verification

```sh
python3 -m unittest discover -s tests -v
cd dashboard
go test ./...
go build -o bin/dashboard .
```

The pipeline tests cover missing-value handling, quartiles, group membership, and complete institution coverage. The Go tests cover the embedded dashboard, versioned JSON endpoint, CSV export, and security headers.
