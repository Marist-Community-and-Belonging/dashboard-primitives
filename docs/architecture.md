# Application architecture

## Runtime

The dashboard ships as one Go binary. Gin provides HTTP routing, response headers, versioned data endpoints, and CSV export. Go's `embed` package packages the static site, D3 library, and processed overview dataset into that binary.

```text
Official final IPEDS release listing and Complete Data File archives
        ↓
scripts/ipeds/refresh.py
        ↓
data/config/ipeds-releases.json + immutable data/raw cache
        ↓
scripts/ipeds/build_{overview,diversity_access,success_equity,affordability_resources}.py
        ↓
dashboard/web/data/*-{2019..2023}.json
        ↓
Go embed → Gin routes → HTML/CSS/JavaScript/D3
```

The browser never calls NCES directly. Page availability and performance therefore do not depend on live federal services.

## HTTP surface

- `/` serves the embedded dashboard shell.
- `/marist-profile` serves a Marist-only selected-year profile and multi-year institutional trends assembled from the same versioned datasets.
- `/assets/*` serves embedded CSS, JavaScript, D3, and the favicon.
- `/api/v1/overview/releases` lists the validated collections embedded in the binary.
- `/api/v1/overview?year={collection year}` serves the exact processed dataset used by the charts. With no year, it serves the latest embedded final collection (or the latest release only when no final release is embedded).
- `/api/v1/export.csv?year={collection year}` exports the six displayed measures and comparison medians for the active collection.
- `/api/v1/diversity-access?year={collection year}` serves the processed composition, gap, access, and scatterplot dataset.
- `/api/v1/diversity-access/export.csv?year={collection year}` exports the institution-level values displayed on Diversity & Access.
- `/api/v1/success-equity?year={collection year}` serves institutional outcome bands and Marist subgroup graduation gaps.
- `/api/v1/success-equity/export.csv?year={collection year}` exports subgroup rates, gaps, comparison medians, and available cohort-count fields.
- `/api/v1/affordability-resources?year={collection year}` serves net-price, income-band, Pell, and graduation comparison data.
- `/api/v1/affordability-resources/export.csv?year={collection year}` exports the institution-level values shown on Affordability.
- `/api/v1/health` reports service and embedded-release availability.
- `/api/v1/features` reports backend-controlled visualization-section visibility. Environment overrides use `DASHBOARD_FEATURE_{SECTION}=false`; all sections default to visible and source data remain available.

API paths are versioned so future schema changes do not silently break published pages or downstream users.

## Frontend conventions

- HTML owns content structure, navigation, source notes, and the accessible comparison table.
- CSS owns layout and presentation without a component framework.
- D3 owns quantitative scales and SVG comparison plots only.
- Every chart has an equivalent value in ordinary HTML and in the comparison table.
- Essential context never depends on hover.
- Missing and unavailable values remain explicit rather than becoming zero.
- The year control on every page is populated from the embedded release catalog. The five final collections from 2019–20 through 2023–24 are available.
- Year changes fetch and render only the selected dataset, update browser history without reloading the document, and preserve the selected year across section navigation.
- Historical charts request every embedded final collection and show Marist with peer and aspirant medians. The selected-year charts and CSV exports remain separate from the five-year trend.
- The Marist Profile page reuses all four selected-year endpoints for its at-a-glance view and the Overview history for six Marist-only trends. It has no manually maintained values.
- Cards and chart marks use a shared intersection observer for one-time viewport reveals. Re-rendered year-specific marks receive a fresh reveal, while reduced-motion preferences bypass the animation timing.
- Metric metadata defines whether higher or lower values are favorable. A small positive tag is calculated from the selected year at runtime and appears only when Marist compares favorably with the peer median. The tag gives the exact difference, and the same rule applies automatically to newly ingested final collections.
- Pointer details appear in a viewport-aware floating tooltip beside the cursor; keyboard focus anchors the same tooltip beside the selected mark. These overlays never change document layout, and interquartile ranges remain available in the ordinary HTML comparison table.
- Visualization feature flags operate only at the whole-section level. They do not filter institutions or selectively suppress subgroup values.
- Major analytical sections include accessible expand and collapse controls. Sections begin expanded and retain ordinary headings and tables.

## Deployment

Build with `go build -o bin/dashboard .` from `dashboard/`. The resulting binary contains the current public datasets and static assets. Run `python3 scripts/ipeds/refresh.py --year YEAR` from the repository root after NCES marks a new collection final, then rebuild the binary.
