# Marist IPEDS Benchmark Dashboard — Project Handoff

## Objective

Build a focused, public-facing dashboard that shows where Marist University stands relative to its official peer and aspirant institutions using reproducible IPEDS data.

The dashboard must answer three questions:

1. Where is Marist now?
2. How does Marist compare with its peer median?
3. How far is Marist from the aspirant range?

Diversity, access, and equity are central to the dashboard. They are not an optional appendix.

## Scope guardrails

- Build only the public IPEDS comparison layer.
- Do not build an authenticated/internal operational-data layer.
- Keep the product to four dashboard pages.
- Do not turn the dashboard into an encyclopedia of every IPEDS field.
- Prefer a small number of well-defined metrics over a large number of weakly explained charts.
- Do not create an overall institutional ranking or opaque composite score.
- Do not imply causation from cross-institutional associations.

## Required first task: investigate IPEDS data access

Before building production ingestion, complete and document an IPEDS data-access spike.

Research the current official NCES/IPEDS access surfaces, including:

- Complete Data Files and their data dictionaries
- Custom Data Files and Compare Institutions CSV exports
- Annual IPEDS Access databases and metadata workbooks
- Any current, officially supported API, data-stream, JSON, or machine-readable endpoint
- Authentication, keys, rate limits, pagination, release types, versioning, and terms of use for any discovered endpoint
- Whether an apparent endpoint is documented and supported or merely an internal Data Center implementation detail

Current official documentation prominently supports downloadable CSV files and annual Access databases. It does not clearly advertise a stable public REST API. Do not assume that a production-safe API exists. If an API/data-stream endpoint is found, verify it with a small reproducible request and retain evidence of its official support.

Create `docs/ipeds-access.md` containing:

- Access methods tested
- Example requests or download URLs
- Authentication requirements
- Response/file schemas
- Reliability and maintenance risks
- Recommended production method
- Fallback method
- Release-year and final/provisional behavior

The ingestion layer must expose a source adapter so the dashboard is not coupled to one delivery mechanism:

```text
IpedsSource
  list_releases()
  fetch_dictionary(year)
  fetch_component(year, component)
  fetch_institutions(unitids)
```

Preferred production order:

1. Official documented API/data stream, if verified as stable and suitable
2. Official Complete Data Files/CSV downloads
3. Official annual Access database plus metadata workbook

Do not build production ingestion by automating clicks or scraping the IPEDS Data Center UI.

Official starting points:

- https://nces.ed.gov/ipeds/use-the-data
- https://nces.ed.gov/ipeds/use-the-data/download-access-database
- https://nces.ed.gov/ipeds/use-the-data/new-to-ipeds
- https://nces.ed.gov/ipeds/use-the-data/timing-of-ipeds-data-collection
- https://nces.ed.gov/ipeds/survey-components

As of September 25, 2026, IPEDS lists Fall 2025 provisional data as its latest fall release. The official Access database page lists 2023-24 as final and 2024-25 as provisional. Use final data by default for the initial coherent comparison dataset. Support provisional data only when it is clearly labeled in the UI and data model.

## Institutions

Use IPEDS `UNITID` as the permanent institution key. Resolve and manually verify every UNITID before analysis.

### Focal institution

- Marist University, New York

### Official peers

- Elon University, North Carolina
- Fairfield University, Connecticut
- Hofstra University, New York
- Loyola University Maryland, Maryland
- Providence College, Rhode Island
- Quinnipiac University, Connecticut
- Sacred Heart University, Connecticut
- Saint Joseph's University, Pennsylvania
- Seton Hall University, New Jersey
- Siena College, New York

### Official aspirants

- Boston College, Massachusetts
- Bucknell University, Pennsylvania
- College of the Holy Cross, Massachusetts
- Fordham University, New York
- Lafayette College, Pennsylvania
- Lehigh University, Pennsylvania
- Northeastern University, Massachusetts
- Villanova University, Pennsylvania

Store group membership separately from institution attributes:

```text
institution_group_membership
  unitid
  group_name       # marist | peer | aspirant
  effective_start
  effective_end
  source
```

Source for the groups: https://www.marist.edu/offices/institutional-research/peer-aspirant

## Time coverage and release policy

- Target five years for the MVP.
- Extend to ten years only if definitions remain comparable and the added history materially improves interpretation.
- Retain collection year, data year, cohort year, release type, and retrieval date separately.
- Never silently combine provisional and final releases.
- Preserve IPEDS imputation and status flags.
- Flag pandemic-affected years in trends rather than deleting them.
- Financial values used in trends should have an optional constant-dollar transformation with the inflation source and base year shown.

## Dashboard information architecture

Build exactly four primary pages.

### 1. Overview

Use six headline metrics:

- Undergraduate enrollment
- Acceptance rate
- First-year retention rate
- Six-year graduation rate
- Average net price
- Pell Grant recipient share

For each metric show:

- Marist value
- Peer median
- Aspirant median
- Five-year direction
- Data year and cohort year where relevant

Recommended visual pattern: Marist marker against peer and aspirant interquartile bands, plus a restrained sparkline.

### 2. Diversity & Access

Required measures:

- Undergraduate enrollment composition by IPEDS race/ethnicity category
- Five-year change in representation
- International/nonresident student share
- Reported sex distribution using the categories available in the selected IPEDS vintage
- Pell recipient share as a socioeconomic-access indicator
- Marist composition compared with peer and aspirant aggregates

Required visuals:

- 100% stacked composition bars for Marist, peer aggregate, and aspirant aggregate
- Trend view for selectable population groups
- Gap heatmap showing Marist minus peer median and Marist minus aspirant median
- Diversity-versus-graduation scatterplot with undergraduate enrollment as bubble size

Do not present one unexplained "diversity score." If a diversity index is included, define it in plain language, display its formula, and show the underlying composition beside it. A suitable optional index is the probability that two randomly selected students are reported in different racial/ethnic groups:

```text
diversity_index = 1 - sum(group_share ^ 2)
```

The index must not replace population-specific reporting.

### 3. Success & Equity

Required measures:

- First-year retention
- Four-year graduation where comparable
- Six-year graduation
- Graduation outcomes by race/ethnicity
- Graduation outcomes by reported sex
- Pell-recipient outcomes where present and definitionally comparable
- Difference between each subgroup and the institution-wide result
- Cohort numerator and denominator in tooltips/details

Recommended visuals:

- Equity-gap dot plot centered on the institutional outcome
- Marist/peer/aspirant outcome bands
- Selectable five-year trend where the cohort definition is stable

Do not rank tiny cohorts. Suppress or annotate small denominators according to an explicit, configurable policy.

### 4. Affordability & Resources

Keep this page intentionally narrow:

- Published tuition and required fees
- Average net price
- Net price by family-income band
- Pell recipient share
- Instructional spending per FTE
- Endowment assets per FTE

Recommended visuals:

- Net-price-by-income-band slope or grouped dot plot
- Resource-per-FTE comparison bands
- Affordability-versus-graduation scatterplot

Do not label an IPEDS-derived scholarship ratio as Marist's official tuition discount rate.

## Minimum IPEDS components

Start with only these components:

- Directory/Header and Institutional Characteristics (`HD`, `IC`, and current Cost component where applicable)
- Admissions (`ADM`)
- Fall Enrollment (`EF`)
- 12-Month Enrollment (`E12`)
- Student Financial Aid (`SFA`)
- Graduation Rates, Graduation Rates 200%, and Outcome Measures (`GR`, `GR200`, `OM`)
- Finance (`F`)

Defer detailed Human Resources, Academic Libraries, and program-level Completions unless a required metric cannot be produced without them.

## Canonical metrics

Implement metrics in a central semantic layer, not separately in chart components.

```text
acceptance_rate = admitted / applicants
yield_rate = enrolled_admits / admitted
pell_share = pell_recipients / relevant_undergraduate_denominator
representation_share = subgroup_enrollment / applicable_enrollment_total
equity_gap = subgroup_outcome_rate - institution_outcome_rate
degrees_or_outcomes_per_100_fte = numerator / fte * 100
instruction_expense_per_fte = instruction_expense / student_fte
endowment_per_fte = endowment_assets / student_fte
five_year_change = latest_value - value_five_years_prior
peer_position = percentile_rank(Marist within peer institutions)
peer_gap = Marist - peer_median
aspirant_gap = Marist - aspirant_median
```

Every metric definition must specify:

- Source component and raw variable names
- Numerator and denominator
- Population and cohort
- Data year and collection year
- Unit and formatting
- Missing-value behavior
- Suppression rule
- Whether imputed records are included
- Known definition breaks across years

## Suggested normalized data model

```text
institutions
  unitid
  institution_name
  state
  control
  level

observations
  unitid
  metric_id
  value
  numerator
  denominator
  subgroup_dimension
  subgroup_value
  data_year
  collection_year
  cohort_year
  release_type
  source_component
  source_variable
  imputation_flag
  retrieved_at

metric_definitions
  metric_id
  display_name
  definition
  formula
  unit
  preferred_direction
  comparability_notes
  suppression_threshold
```

Keep raw downloaded files immutable and checksummed. Produce cleaned tables deterministically from raw sources. Cache the processed public dataset used by the dashboard so page loads do not depend on live NCES availability.

## Comparison behavior

- Default comparison: Marist against peer median and aspirant median/range.
- Use median and interquartile range because institutional distributions can be skewed.
- Allow users to reveal individual institutions on demand.
- Keep the initial view uncluttered; do not label all 19 institutions at once.
- Permit filters for year, comparison group, and a small number of demographic categories.
- Use weighted aggregation only when presenting a combined student-population composition. Clearly label it as weighted.
- Use institution-level median for the typical-institution comparison. Do not confuse the two aggregation methods.

## Diversity methodology and limitations

The interface must explain that:

- IPEDS uses federal race/ethnicity reporting categories.
- Category definitions and labels can change across vintages.
- IPEDS sex reporting does not represent the full range of gender identities.
- Pell status is an imperfect proxy for socioeconomic access.
- Graduation measures cover defined cohorts rather than every enrolled student.
- Small cohorts can produce unstable percentages.
- A missing value, zero, suppressed value, and not-applicable value are different states.

Use respectful labels sourced from the applicable IPEDS dictionary. Preserve the raw category code and map it to a versioned display label.

## Brand and visual design

Follow the Marist visual identity:

- Marist Red: `#C91235`
- Greystone Gray: `#63666F`
- White: `#FFFFFF`
- Reynard Red: `#FF2745`
- Hudson River Blue: `#3C8CFF`
- Source Serif for prominent headings
- Inter for body copy, filters, labels, captions, and numbers

Encoding convention:

- Marist: red
- Peers: neutral gray
- Aspirants: blue

Do not use color alone to communicate group membership. Pair color with labels, shapes, line styles, or direct annotations. Test all foreground/background combinations for WCAG contrast. Avoid rainbow palettes for race/ethnicity; use an accessible categorical palette and keep category colors consistent across every page.

Relevant brand sources:

- https://www.marist.edu/offices/communications-marketing/brand-management/colors
- https://www.marist.edu/documents/d/guest/mu_style-guide_2-12-1

## Accessibility and public trust

- Meet WCAG 2.2 AA where feasible.
- Provide keyboard navigation and visible focus states.
- Give every chart an equivalent accessible table or concise data summary.
- Include units, source, release type, and year near each chart.
- Do not rely on hover for essential information.
- Support reduced motion.
- Format percentages and currency consistently.
- Include a methodology/data-quality page or drawer.
- Provide a CSV download of the exact filtered data shown.

## Engineering expectations

Inspect the existing repository before selecting frameworks or replacing configuration. Reuse the current stack when reasonable.

Recommended separation:

```text
data/raw/              # immutable official source files; normally gitignored
data/processed/        # reproducible dashboard-ready extracts
scripts/ipeds/         # acquisition, validation, normalization
src/data/              # typed/queryable app data access
src/metrics/           # canonical metric formulas
src/components/        # reusable chart and comparison components
src/pages/             # four required dashboard pages
docs/                  # access findings, methodology, data dictionary
tests/                 # ingestion, formulas, rendering, accessibility
```

Do not hard-code display values into UI components. Generate them from the processed dataset.

## Validation requirements

- Verify every institution name and UNITID against the official directory.
- Reconcile a sample of Marist values against the IPEDS institution profile or reported-data view.
- Unit-test all ratios with known numerator/denominator fixtures.
- Test missing, suppressed, imputed, and not-applicable values.
- Check that peer medians exclude Marist unless a view explicitly says otherwise.
- Check weighted composition calculations independently from institution medians.
- Prevent divide-by-zero and impossible percentages.
- Run accessibility checks and manually verify keyboard operation.
- Test narrow and wide layouts.
- Display a clear empty state when a subgroup or year is unavailable.

## MVP acceptance criteria

The MVP is complete when:

1. The IPEDS access spike is documented and a production source/fallback is chosen.
2. The 19 institutions and their UNITIDs are verified.
3. Five comparable years of final data are processed, or any shorter coverage is justified per metric.
4. All four required pages are functional.
5. Diversity & Access and Success & Equity include subgroup composition, outcomes, cohort context, and limitations.
6. Every headline value traces to a raw IPEDS component and variable.
7. Marist, peer median/range, and aspirant median/range are visually distinguishable and accessible.
8. The dashboard passes formula, missing-data, responsive-layout, and accessibility tests.
9. A methodology note and filtered CSV download are available.
10. The README documents local setup, data refresh, tests, and build commands.

## Recommended execution order

1. Inspect repository and record the current stack.
2. Complete `docs/ipeds-access.md` and choose the ingestion method.
3. Resolve and verify UNITIDs.
4. Create the raw-to-normalized data pipeline and versioned dictionary mappings.
5. Implement and test the canonical metrics.
6. Build a shared comparison-band component.
7. Build Overview.
8. Add shared interaction behavior: year switching, pointer and keyboard details, clear active filters, and explicit unavailable states. Hover and focus details must supplement—not replace—visible values and accessible tables.
9. Build Diversity & Access.
10. Build Success & Equity.
11. Build Affordability & Resources.
12. Add methodology, accessible tables, and filtered CSV export.
13. Run data reconciliation, responsive QA, interaction QA, and accessibility QA.

## Definition of a good result

The final product should feel like a concise institutional story, not a database browser. A visitor should understand Marist's current position, diversity and access profile, equity in student success, and distance from aspirant institutions within a few minutes, while still being able to inspect definitions and underlying data.

## Current implementation

The dashboard now includes five final collections from 2019-20 through 2023-24, a data-driven year selector, five-year comparison trends, accessible pointer and keyboard details, collapsible sections, and automated final-release ingestion through `scripts/ipeds/refresh.py`. Metric metadata controls favorable-direction accents, so newly ingested years are evaluated against their own peer and aspirant medians without year-specific presentation copy. The 2024-25 release remains excluded while NCES labels it provisional.
