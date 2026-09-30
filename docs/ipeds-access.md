# IPEDS data access spike

Last verified: 2026-09-25

## Decision

Use each final annual IPEDS Access database as the release anchor and export only the required tables to validated CSV inputs. This provides an explicit final-release artifact and a coherent annual bundle. Use final Complete Data Files for earlier years when their revised status is verified from the official file index.

No officially documented general-purpose IPEDS REST API was found. NCES exposes JSON-capable ArcGIS services for geographic and selected institution data, but those services do not cover the survey components and versioned release behavior required by this dashboard. They are not a substitute for Complete Data Files.

The application must consume a source adapter rather than download files directly from UI code:

```text
IpedsSource
  list_releases()
  fetch_dictionary(year)
  fetch_component(year, component)
  fetch_institutions(unitids)
```

## Access methods tested

### Complete Data Files — historical component source

- Official documentation: <https://nces.ed.gov/ipeds/help/complete-data-files>
- Interactive file index: <https://nces.ed.gov/ipeds/datacenter/Default.aspx?fromIpeds=true&gotoReportId=7>
- File pattern observed and tested: `https://nces.ed.gov/ipeds/datacenter/data/{FILE}.zip`
- Reproducible request tested on 2026-09-25:

  ```sh
  curl -I https://nces.ed.gov/ipeds/datacenter/data/HD2023.zip
  ```

- Result: HTTP 200, `Content-Type: application/x-zip-compressed`, `Content-Length: 1110720`, `Last-Modified: Sun, 21 Sep 2025 20:40:56 GMT`, and an ETag.
- Authentication: none observed.
- API key: none.
- Pagination: not applicable; one ZIP per component/file.
- Schema: ZIP containing a CSV. Categorical labels and variable definitions are supplied by the matching data dictionary/read-program files.
- Release behavior: the portal identifies provisional and final availability by component and collection year. ZIP contents must be inspected and recorded; release type must never be inferred only from the calendar year.
- Maintenance risk: filenames and component splits vary by year. The adapter must use a versioned release manifest instead of constructing every filename from a single formula.

### Custom Data Files and Compare Institutions

- Official entry point: <https://nces.ed.gov/ipeds/use-the-data>
- Custom Data Files return zipped CSV extracts selected through the Data Center.
- Compare Institutions returns CSV for more than 7,000 institutions and up to 250 variables.
- Authentication: no account is required for ordinary public extracts; the Data Center may issue an anonymous session identifier.
- Strength: useful for one-off reconciliation and manual validation.
- Risk: selection is session/UI driven, harder to reproduce, and less suitable for an unattended production refresh.
- Production status: validation tool, not the primary ingestion method.

### Annual Access database — final-release anchor

- Official downloads: <https://nces.ed.gov/ipeds/use-the-data/download-access-database>
- Coverage: annual databases beginning with 2004-05.
- Current release page observed on 2026-09-25:
  - 2023-24 Access: final, released March 2026.
  - 2024-25 Access: provisional, released March 2026.
- Schema: a zipped Microsoft Access database plus a separate Excel metadata workbook. Database metadata tables describe each table and variable.
- Authentication: none.
- Strength: coherent annual bundle with an explicit final/provisional label and metadata tables.
- Risk: large downloads, Access-specific tooling, and higher extraction overhead in Linux/CI environments.

### API, data stream, JSON, and machine-readable services

- The official IPEDS “Use the Data,” “New to IPEDS,” Complete Data Files, and Access Database documentation prominently describe CSV ZIPs, Access databases, and downloadable glossary JSON.
- No stable, documented REST API covering the required `HD`, `IC`, `ADM`, `EF`, `E12`, `SFA`, `GR`, `GR200`, `OM`, and `F` components was located.
- NCES does operate ArcGIS REST endpoints, including IPEDS/EDGE institution layers with JSON, GeoJSON, pagination, and record limits. Those endpoints are geographic products or selected views; they do not document the complete survey release contract required here.
- Data Center network calls or session endpoints discovered through browser inspection must be treated as internal implementation details unless NCES publishes a support contract for them.
- Authentication, API keys, and rate limits are not applicable to the selected public downloads. Use conservative sequential downloads, conditional requests using ETag/Last-Modified when practical, and local caching.

## Release policy

NCES distinguishes collection year from the year represented by a measure. Different components can reflect a fall term, academic year, fiscal year, or an older cohort.

- Provisional data are generally released about nine months after a collection period closes, after quality control and imputation.
- Institutions can revise provisional values during the following collection cycle.
- Revised/final data are released after that revision window.
- Use final data by default for the first coherent dashboard dataset.
- Never silently mix final and provisional observations.
- Store `data_year`, `collection_year`, `cohort_year`, `release_type`, and `retrieved_at` separately.
- Keep imputation and status flags. Missing, zero, suppressed, and not-applicable are distinct states.

The production panel contains five final collections from 2019-20 through 2023-24. The 2024-25 Access database remains provisional as of September 25, 2026 and is not mixed into the final series.

`scripts/ipeds/refresh.py` checks the official Access release table before downloading a collection. It refuses any year not explicitly marked final, downloads the required Complete Data File archives, records archive and extracted-file checksums, and rebuilds every dashboard dataset. For 2019-20 and 2020-21, NCES does not publish the required derived archives through the Complete Data File endpoint, so the refresh script deterministically calculates the dashboard fields from final ADM, EF, GR, GR Pell/SSL, and SFA records.

## Reliability controls

1. Maintain a checked-in release manifest containing the exact official URL, component, collection year, expected archive members, release type, retrieval date, SHA-256, ETag, and Last-Modified value.
2. Store downloaded archives immutably under `data/raw/{collection_year}/` and exclude them from Git.
3. Fail closed if a checksum or expected archive member changes.
4. Parse dictionaries before observations and version label mappings by release.
5. Produce normalized outputs deterministically; the public site reads only cached processed data.
6. Reconcile a sample of Marist values with the IPEDS institution profile or Compare Institutions export before publishing.

## Sources

- <https://nces.ed.gov/ipeds/use-the-data>
- <https://nces.ed.gov/ipeds/help/complete-data-files>
- <https://nces.ed.gov/ipeds/use-the-data/download-access-database>
- <https://nces.ed.gov/ipeds/use-the-data/new-to-ipeds>
- <https://nces.ed.gov/ipeds/use-the-data/timing-of-ipeds-data-collection>
- <https://nces.ed.gov/ipeds/survey-components/ipeds-survey-methodology>
- <https://nces.ed.gov/ipeds/datacenter/ReleaseCycleInfo.aspx>
- <https://nces.ed.gov/arcgis/rest/services/IPEDS/IPEDS/MapServer/layers>
