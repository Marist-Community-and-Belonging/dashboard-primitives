# Data Dashboard Design System and LLM Implementation Playbook

## Purpose

This document is a reusable specification for building polished, public-facing institutional data dashboards. It captures the visual language, information architecture, chart patterns, data contracts, interactions, accessibility requirements, and quality checks needed to produce a dashboard similar to this project without copying institution-specific content.

Use it as:

- a design system for human designers and developers;
- an implementation contract for another LLM;
- a review checklist before a dashboard is published;
- a template that can be rebranded by replacing the values in the brand input contract.

Examples use a university benchmarking dashboard with one focus institution, a peer group, and an aspirant group. Replace those labels when the comparison model differs.

## 1. Product principles

1. **Lead with the result.** Put the value and plain-language meaning before methodology.
2. **Show context, not rankings.** Compare the focus institution with transparent group summaries without inventing a composite score.
3. **Keep every claim reproducible.** A displayed value must trace to a source, variable, population, year, and transformation.
4. **Make the default view simple.** Put exact tables and deeper methodology in accessible disclosures.
5. **Do not hide inconvenient results.** Positive emphasis can be rule-based, but all valid results stay visible.
6. **Use animation to explain state change.** Motion should reveal chart structure, not decorate the page.
7. **Make hover optional.** Essential meaning and exact values must remain available without a mouse.
8. **Design for annual updates.** New data should flow through the same configuration and build pipeline without hand-edited prose or chart code.
9. **Preserve meaning at every screen size.** Responsive layouts may stack, scroll internally, or simplify decoration, but not remove context.
10. **Prefer a few clear charts.** Every visualization needs a specific question it answers.

## 2. Brand input contract

Before implementation, collect or define the following inputs. Do not guess official brand assets.

| Input | Required | Guidance |
| --- | --- | --- |
| Full horizontal logo | Yes | Prefer SVG; use a high-resolution transparent PNG when SVG is unavailable. |
| Compact mark or favicon | Yes | Use an official shield, icon, or monogram supplied by the organization. |
| Logo alt text | Yes | Use the organization name, not a description of the artwork. |
| Primary brand color | Yes | Used for the focus institution and restrained accents. |
| Dark brand color | Yes | Used for active and high-contrast states. |
| Neutral text colors | Yes | Provide dark, medium, and subtle text values. |
| Comparison color | Yes | Distinct from the primary brand color and accessible on white. |
| Success accent | Yes | Reserved for objectively favorable tags, never general decoration. |
| Display typeface | Recommended | A serif often works well for institutional titles and large values. |
| Interface typeface | Yes | Use a highly legible sans serif with system fallbacks. |
| Comparison groups | Yes | Define group names, membership, and aggregation rules. |
| Source and release policy | Yes | Define authoritative sources and whether provisional releases are allowed. |

If a requested font is not licensed or locally available, use a system-safe substitute. Never fetch a font from an unknown third party in a production dashboard.

## 3. Design tokens

Keep all reusable values as semantic tokens. The names should describe purpose rather than a specific hex value.

```css
:root {
  /* Brand */
  --brand-primary: #c91235;
  --brand-primary-dark: #9f0f2b;
  --comparison-accent: #3c8cff;

  /* Text and surfaces */
  --text-strong: #202127;
  --text-muted: #63666f;
  --border: #d8dade;
  --border-soft: #eceef1;
  --surface: #ffffff;
  --surface-muted: #f6f7f8;

  /* Semantic states */
  --positive: #285b56;
  --positive-border: #3f7771;
  --positive-surface: #eef6f4;
  --negative: #8e2038;
  --focus: #3c8cff;

  /* Layout */
  --content-max: 1280px;
  --page-gutter: 24px;
  --page-gutter-mobile: 16px;
  --section-gap: 48px;

  /* Shape and motion */
  --radius-small: 4px;
  --radius-medium: 8px;
  --shadow-tooltip: 0 8px 24px rgb(0 0 0 / 20%);
  --ease-out: cubic-bezier(.2, .75, .25, 1);
}
```

These values are a reference palette, not a universal brand. Replace the three brand and comparison colors while preserving contrast and semantic roles.

### Color roles

| Role | Reference | Use |
| --- | --- | --- |
| Focus institution | Primary brand red | Main dot, main line, active navigation, restrained accents |
| Peer aggregate | Medium gray | Square marks, dashed lines, neutral comparison bands |
| Aspirant aggregate | Bright blue | Triangle marks, dotted lines, pale comparison bands |
| Positive result | Deep teal-green | Small factual comparison tag only |
| Negative divergence | Dark red | Signed gaps when direction has a defined meaning |
| Neutral structure | Light grays | Rules, gridlines, card boundaries, table rows |

Color must not be the only group cue. Pair it with text, symbol shape, line pattern, or position.

### Categorical chart palette

Use a separate palette for unordered categories such as race and ethnicity. A reference set is:

```text
#8e2038  #3e5968  #b35d38  #596b3d  #705780
#9a7a28  #3f7771  #777982  #3c8cff
```

Categorical colors identify categories only. They must never imply good, bad, priority, or rank.

## 4. Logo and identity rules

- Use the official full wordmark in the masthead when horizontal space permits.
- Use the compact official mark only for the favicon or very narrow placements.
- Do not redraw, recolor, stretch, crop, or synthesize a logo.
- Preserve the source aspect ratio with `width: auto` and a fixed maximum height.
- Give the logo clear space at least equal to one quarter of its rendered height.
- Use a descriptive file name such as `organization-name-logo.png`.
- Set `alt` to the organization name. If adjacent text repeats the same name, an empty `alt` may be appropriate.
- Keep dashboard identity separate from the logo with a thin divider and a compact product label.

Reference masthead dimensions:

| Element | Desktop | Mobile |
| --- | --- | --- |
| Masthead minimum height | 78 px | 72 px |
| Logo height | 48 px | 39 px |
| Logo to product-label gap | 16 px | 12 px |
| Product-label size | 11 px | 10 px |
| Product-label tracking | 0.16 em | 0.14 em |

## 5. Typography

Use two complementary families:

```css
--font-interface: Inter, ui-sans-serif, system-ui, -apple-system,
  BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-display: Georgia, "Times New Roman", serif;
```

The interface family handles navigation, labels, tables, annotations, controls, and body text. The display family is reserved for the page title, section titles, and large values.

| Role | Family | Reference size | Weight | Line height |
| --- | --- | ---: | ---: | ---: |
| Page title | Display | `clamp(34px, 4vw, 48px)` | 700 | 1.05 |
| Section title | Display | 25 px | 700 | 1.2 |
| Metric value | Display | 36 px | 700 | 1.0 |
| Card title | Interface | 18 to 20 px | 700 | 1.25 |
| Body | Interface | 16 px | 400 | 1.55 |
| Navigation | Interface | 14 px | 650 | 1.3 |
| Eyebrow | Interface | 12 px | 800 | 1.2 |
| Chart label | Interface | 12 to 13 px | 500 to 650 | 1.3 |
| Source note | Interface | 12 to 13 px | 400 | 1.45 |

Eyebrows may use uppercase with 0.16 em tracking. Avoid all caps for sentences or long labels.

## 6. Layout system

Use a centered content container:

```css
.page-shell {
  width: min(calc(100% - 48px), 1280px);
  margin-inline: auto;
}

@media (max-width: 800px) {
  .page-shell { width: min(calc(100% - 32px), 1280px); }
}
```

### Grid rules

- Use a two-column KPI grid on wide screens and one column at 800 px or below.
- Keep trend cards full width until approximately 1100 px, then use two columns when labels remain readable.
- Use 48 px above major analytical sections.
- Use 24 to 32 px between related cards.
- Align titles, values, metadata, plots, and comparison labels to a shared internal grid.
- Prefer borders and whitespace over heavy card shadows.
- Give wide tables and charts their own horizontal scroll container. Never allow page-level horizontal overflow.
- Do not shrink a chart until labels collide. Stack it or make its inner canvas scrollable.

### Page anatomy

Each page should follow the same order:

1. masthead and section navigation;
2. page title and one-sentence purpose;
3. year selector, data status, and download action;
4. headline measures;
5. one or more focused analytical sections;
6. exact-value tables in disclosures;
7. source, definition, and methodology notes.

The overview page should remain the shortest page. It summarizes the dashboard rather than repeating every chart.

## 7. Information architecture

A reusable institutional dashboard usually benefits from four sections:

| Section | Primary question | Typical content |
| --- | --- | --- |
| Overview | What should I know first? | Four to six headline measures and compact comparisons |
| Institution profile | What does one institution look like in a selected year and over time? | Compact enrollment, composition, outcomes, affordability, and institution-only trends |
| Access and composition | Who enrolls, and how does access compare? | Composition, participation, representation gaps, trends |
| Success and equity | What outcomes do students experience? | Retention, completion, subgroup gaps, outcome trends |
| Affordability and resources | What does attendance cost after aid? | Net price, income bands, aid participation, cost trends |

Only create a section when it answers a distinct question. Do not keep an empty fourth card or add a weak chart only to make a grid symmetrical.

## 8. Content and labeling rules

### Metric card hierarchy

Every headline card should contain, in this order:

1. metric name;
2. one short definition;
3. primary value;
4. year or cohort metadata;
5. optional favorable tag;
6. visual comparison;
7. peer and aspirant medians;
8. exact values or methodology in a disclosure when needed.

### Writing standards

- Use sentence case for headings and labels.
- Use plain language and define the population, not just the abbreviation.
- Use concise definitions such as “Annual cost remaining after grants and scholarships.”
- State whether dollars are nominal or inflation adjusted.
- Distinguish collection year, academic year, fall term, and cohort year.
- Use “percentage points” for differences between percentages.
- Avoid marketing claims, rankings, filler, and hand-written year-specific conclusions.
- Avoid corrective labels such as “not aid received.” Write the positive definition directly.
- Avoid unexplained acronyms. A source variable code can appear as secondary metadata.
- Do not use an em dash as a substitute for a sentence or parenthesis in ordinary interface copy.
- Keep interpretation separate from the formal metric definition.

## 9. Chart selection guide

Choose the chart from the question, not from available space.

| Question | Recommended chart | Avoid when |
| --- | --- | --- |
| How does one value compare with two groups? | Bullet comparison band | Users need every institution shown |
| How has a measure changed over time? | Multi-series line chart | Fewer than three time points exist |
| How does a whole divide into categories? | 100% stacked bar | Categories overlap or do not sum to a whole |
| Which categories are above or below a benchmark? | Diverging gap chart | The benchmark or sign direction is ambiguous |
| How do two measures relate across institutions? | Scatterplot | There are too few observations or no real question |
| How does each subgroup differ from the overall rate? | Centered lollipop or gap chart | Subgroup denominators are unreliable or missing policy disallows display |
| How do values differ across ordered income bands? | Multi-series dot plot | The bands are unordered or definitions differ |
| What are the exact values? | Table | Never avoid a table when precision is the primary task |

## 10. Chart specifications

### 10.1 Bullet comparison band

Use for a focus value plus peer and aspirant distributions.

Visual grammar:

- focus institution: primary-color circle on the baseline;
- peer middle 50 percent: dark neutral band with a median tick;
- aspirant middle 50 percent: pale comparison band with an outline and median tick;
- place peer and aspirant bands on opposite sides of the baseline when that makes overlap easier to read;
- show exact medians below the chart in ordinary HTML.

Scale rules:

- percentages use a 0 to 100 domain;
- currency and counts use a padded data extent with sensible rounding;
- never truncate a percentage scale merely to exaggerate a small difference;
- use the same domain for the same metric across year changes.

Tooltip content:

```text
Focus institution: 82%
Peer median: 79%
Peer middle 50%: 74% to 84%
```

### 10.2 Historical line chart

Use at least three comparable final releases.

Encoding:

| Series | Color | Line | Point |
| --- | --- | --- | --- |
| Focus institution | Brand primary | Solid, 3 px | Circle |
| Peer median | Medium gray | Dashed, 2.25 px | Square |
| Aspirant median | Comparison accent | Dotted, 2.25 px | Triangle |

Requirements:

- label axes with units;
- preserve chronological order;
- indicate the selected year without obscuring the trend;
- make points keyboard focusable;
- show the exact series in a disclosure table;
- outline the active point on hover and focus;
- do not connect across a missing observation unless the discontinuity is explicitly encoded.

### 10.3 100% stacked composition bar

Use for mutually exclusive categories that form a complete population.

- Normalize displayed widths to 100 percent to absorb rounding.
- Keep category order stable across groups and years.
- Use enrollment-weighted group aggregates when comparing populations, and label them as weighted.
- Provide segment name, percentage, population, and year in the tooltip.
- Provide a conventional table because small segments cannot carry labels reliably.
- Do not use donut charts when users must compare category shares across multiple groups. Aligned bars are easier to compare.

### 10.4 Diverging gap chart

Use for signed differences such as focus share minus group median.

- Put zero at the center.
- Label the calculation explicitly.
- Use one color for negative values, a neutral zero, and another for positive values.
- Do not imply that positive is favorable unless domain rules establish that interpretation.
- Sort by a stable category order or absolute gap, then state the rule.
- Include both the source values and the calculated gap in the table.

### 10.5 Scatterplot

Use to explore a relationship between two measures across institutions.

- Encode group with both color and symbol shape.
- Use bubble size only for a meaningful third variable such as enrollment.
- Bound bubble size so large institutions do not hide small ones.
- Label the focus institution directly when space permits.
- Put institution name, group, x value, y value, and size value in the tooltip.
- Include every plotted institution in an exact-value table.
- Do not add a trend line unless the methodology and intended inference are defensible.
- Do not imply causation from proximity or correlation.

### 10.6 Centered subgroup gap chart

Use to show subgroup outcome minus the focus institution’s overall outcome.

```text
gap = subgroup rate - overall rate
```

- Draw a clearly labeled zero centerline for the overall outcome.
- Start each horizontal connector at zero and end it at the subgroup dot.
- Put the subgroup name on the left.
- Put the subgroup rate and signed gap on the right.
- Reserve enough centerline space so the “Overall” label cannot overlap the line or a dot.
- Animate the connector outward from zero so the visual construction matches the calculation.
- Apply small-cohort suppression before calculating or displaying the gap.
- Do not rank subgroups when denominators are unavailable or unreliable.

### 10.7 Ordered-band dot plot

Use for income ranges or another naturally ordered set of bands.

- Put one row per band.
- Use the same group symbols as the rest of the dashboard.
- Use a common currency axis for all rows.
- Keep bands in semantic order, not sorted by value.
- Define the eligible population because income-band net price often has a different population from overall net price.

### 10.8 KPI card

Use KPI cards for measures that deserve immediate attention, not for every available field.

- Limit an overview to four to six cards.
- Keep card structures identical across pages.
- Use the display face for the number and the interface face for context.
- Never let a large value crowd out the definition or year.
- Use one compact positive tag only when a configured rule is satisfied.

### 10.9 Exact-value table

Every nontrivial chart needs an accessible exact-value equivalent.

- Use a real `<table>` with caption, headers, and scopes.
- Put secondary tables in `<details>` when the visible page would become repetitive.
- Match table order to chart order.
- Format units consistently.
- Preserve unavailable values as “Unavailable,” not zero, blank, or a misleading dash.
- Offer a CSV export for the selected year.

## 11. Group encoding and legends

Define comparison roles once and reuse them everywhere:

```js
const groups = {
  focus:    { color: "#c91235", shape: "circle",   line: "solid" },
  peer:     { color: "#63666f", shape: "square",   line: "dashed" },
  aspirant: { color: "#3c8cff", shape: "triangle", line: "dotted" }
};
```

- Keep legend order stable: focus, peer, aspirant.
- Use direct labels when they reduce eye travel.
- Do not rely on a legend to explain a complex chart calculation.
- Link to an authoritative page that defines comparison-group membership.
- State whether an aggregate is a median, mean, weighted share, or pooled rate.

## 12. Tooltips, hover, and keyboard focus

Tooltips should float over the page and never insert content into the layout.

Reference style:

```css
.chart-tooltip {
  position: fixed;
  z-index: 1000;
  max-width: 310px;
  padding: 8px 10px;
  color: #fff;
  background: rgb(32 33 39 / 96%);
  border-radius: 4px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 20%);
  font-size: 12px;
  pointer-events: none;
}
```

Behavior:

- position beside the pointer while staying inside the viewport;
- on keyboard focus, anchor beside the focused mark;
- use the same content for hover and focus;
- hide on pointer leave, blur, or Escape;
- highlight the active trend point with a clear dark outline;
- give interactive SVG marks `tabindex="0"`, `role="img"`, and a complete `aria-label`;
- never make the tooltip the only source of a definition or exact value.

## 13. Motion and transitions

Use motion consistently and respect `prefers-reduced-motion`.

| Event | Reference duration | Behavior |
| --- | ---: | --- |
| Initial page reveal | 240 ms | Small fade and upward settle |
| Year content change | 160 ms | Brief fade while retaining the page shell |
| Card first enters view | 480 ms | Opacity plus 12 px vertical settle |
| Bar reveal | 620 ms | Expand from its meaningful origin |
| Dot reveal | 320 to 420 ms | Fade and scale from 0.55 to 1 |
| Line or scatter reveal | 520 ms | Fade in after axes are stable |
| Centered gap connector | 560 ms | Expand from the zero centerline |

Implementation rules:

- Observe content with `IntersectionObserver` around a 0.12 threshold.
- Animate each item only the first time it enters the viewport.
- Newly rendered year-specific marks receive a fresh reveal.
- Stagger related marks by about 45 to 90 ms, capped at a small number of steps.
- Bars grow from the baseline or zero point that gives them meaning.
- Keep axes and text stable while marks animate.
- Never delay interaction until an animation finishes.

Reduced-motion fallback:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## 14. Dynamic data contract

Separate the semantic layer from presentation. Do not hard-code values or year-specific conclusions in HTML or JavaScript.

### Release catalog

```json
{
  "releases": [
    {
      "collection_year": 2023,
      "display_year": "2023-24",
      "release_type": "final",
      "retrieved_at": "2026-03-15T00:00:00Z",
      "source_url": "https://authoritative.example/release"
    }
  ]
}
```

### Metric record

```json
{
  "metric_id": "retention_rate",
  "display_name": "First-year retention rate",
  "short_definition": "Full-time first-time students returning the following fall",
  "unit": "percent",
  "favorable_direction": "higher",
  "value": 82.0,
  "data_year": "Fall 2023",
  "collection_year": 2023,
  "cohort_year": null,
  "source_component": "annual_retention_table",
  "source_variable": "SOURCE_CODE",
  "peer": { "count": 9, "median": 79.0, "q1": 75.0, "q3": 84.0 },
  "aspirant": { "count": 9, "median": 85.0, "q1": 81.0, "q3": 88.0 }
}
```

### Required semantics

- `metric_id` is stable across releases.
- `display_name` and `short_definition` come from configuration, not a page template.
- `unit` controls formatting and scale behavior.
- `favorable_direction` is `higher`, `lower`, or `none`.
- `data_year`, `collection_year`, and `cohort_year` remain separate.
- group summaries include the valid count and named statistic.
- missing values are JSON `null`, never zero.
- source component and variable remain available for audit.

### Data pipeline

```text
Authoritative release listing and source files
        -> verified immutable raw cache
        -> versioned metric and institution configuration
        -> deterministic validation and transformation scripts
        -> dashboard-ready JSON and CSV
        -> versioned API
        -> charts and exact-value tables
```

The browser should never depend on a live upstream data provider. Build and validate a public extract first.

## 15. Year switching and historical trends

The year selector must be populated from the release catalog, not a hard-coded list.

When a year changes:

1. validate the requested year against available releases;
2. fetch every page dataset needed for that year;
3. update values, charts, metadata, tables, and CSV links in place;
4. update the URL with `history.pushState` or `history.replaceState`;
5. preserve the selected year across navigation links;
6. refresh screen-reader status text;
7. replay mark-level reveal animations;
8. do not reload the document, masthead, navigation, or CSS.

Historical charts should fetch all eligible final releases and plot comparable definitions only. A selected-year chart and a historical trend answer different questions and should remain separate.

When a new final release is ingested, the same pipeline should:

- verify source identity and checksums;
- add release metadata;
- apply the configured variable mapping;
- validate institution coverage and missing values;
- generate all page datasets;
- expose the year through the release catalog;
- require no new page markup or chart-specific prose.

## 16. Rule-based positive emphasis

Positive emphasis must be restrained, factual, and calculated at runtime.

```js
function favorableDelta(value, benchmark, direction) {
  if (value == null || benchmark == null || direction === "none") return null;
  const delta = value - benchmark;
  if (direction === "higher" && delta > 0) return delta;
  if (direction === "lower" && delta < 0) return delta;
  return null;
}
```

Example tag text:

```text
3.0 percentage points above peer median
$2,450 below peer median
```

Rules:

- show at most one compact tag per headline card;
- state the exact difference;
- do not tint the entire card;
- do not display a negative tag when the rule fails;
- do not assign a favorable direction to measures where more or less is not inherently better;
- keep the underlying measure and comparison visible in every case;
- apply the same rule to every year automatically.

## 17. Data integrity and statistical rules

- Use a single authoritative source family whenever possible.
- Do not mix provisional and final releases in one time series.
- Version release status, retrieval date, source URL, and checksum.
- Define every metric’s population and denominator.
- Calculate peer and aspirant medians at the institution level unless another method is explicitly justified.
- Use weighted aggregation for population composition and label it clearly.
- Preserve source suppression and missingness.
- Validate group membership as mutually exclusive when the model requires it.
- Validate complete expected institution coverage before publishing.
- Store transformation logic in scripts and configuration, not hand-edited output files.
- Fail closed when a file, checksum, variable mapping, or release status is unexpected.
- Apply small-cohort suppression before comparisons, labels, exports, or tooltips.
- Never infer counts from rounded rates.
- Use nominal-dollar labels when values are not inflation adjusted.

## 18. Responsive behavior

At 800 px and below:

- stack KPI cards;
- allow masthead and controls to wrap cleanly;
- preserve 16 px page gutters;
- keep touch targets at least 44 by 44 px;
- move long metadata below the primary value;
- give complex SVGs a minimum internal width and horizontal scroll container;
- avoid rotating labels solely to make them fit.

At 480 px and below:

- reduce the page title to roughly 35 px and metric values to roughly 32 px;
- keep comparison labels in their own rows if necessary;
- place year and download controls vertically when a single row would crowd;
- verify that tooltips cannot extend outside the viewport.

Test at minimum: 320, 375, 768, 1024, 1280, and 1440 CSS pixels.

## 19. Accessibility requirements

- Provide a skip link to main content.
- Use semantic header, navigation, main, section, heading, form, details, and table elements.
- Mark the active navigation item with `aria-current="page"`.
- Label every input and control visibly.
- Announce year loading, success, and errors through an `aria-live` status region.
- Use `role="alert"` for failures that require immediate attention.
- Give every SVG an accessible name and group role.
- Make meaningful marks keyboard focusable.
- Match hover and focus behavior.
- Pair charts with exact-value tables.
- Never rely on color alone.
- Use a visible 3 px focus outline with sufficient contrast.
- Maintain WCAG AA text contrast at minimum.
- Respect reduced-motion settings.
- Make collapse buttons report `aria-expanded` and associate them with the controlled content.
- Do not put essential content only in collapsed sections, tooltips, or downloadable files.
- Test at 200 percent browser zoom without loss of content or function.

## 20. Section feature flags

Whole analytical sections may be controlled by backend configuration when different publishing contexts require different scope.

```text
DASHBOARD_FEATURE_OVERVIEW_HEADLINES=true
DASHBOARD_FEATURE_ACCESS_COMPOSITION=true
DASHBOARD_FEATURE_SUCCESS_EQUITY_GAPS=true
DASHBOARD_FEATURE_AFFORDABILITY_TRENDS=true
```

Feature-flag rules:

- flags control complete sections, not individual institutions or selected unfavorable subgroups;
- data APIs and source records remain intact;
- hidden sections are omitted from navigation and page flow cleanly;
- the default state is documented;
- a missing or malformed flag fails to the declared default;
- editorial decisions remain separate from data transformation.

## 21. Recommended implementation architecture

```text
project/
  app/
    server and API routes
    embedded public assets
  public/
    index and section pages
    assets/
      design-tokens.css
      dashboard.css
      shared.js
      page-specific.js
      official-logo.svg
    data/
      generated year-specific JSON
  config/
    institutions.csv
    metrics.json
    releases.json
    feature-flags.json
  scripts/
    refresh release
    validate raw files
    build page datasets
  tests/
    transformation tests
    API tests
    accessibility and browser checks
  docs/
    architecture.md
    metric-definitions.md
    dashboard-design-system.md
```

### Responsibility boundaries

- HTML owns structure, headings, controls, sources, and table containers.
- CSS owns layout, tokens, responsive behavior, and visual states.
- D3 or another visualization library owns scales, axes, geometry, and marks.
- Shared JavaScript owns year state, navigation preservation, tooltips, animation observers, formatting, and accessibility helpers.
- Page modules own only page-specific data mapping and chart composition.
- The backend owns release validation, feature flags, versioned APIs, and exports.
- Build scripts own all source-specific extraction and transformation.

## 22. Performance and reliability

- Bundle stable third-party chart libraries with the application when offline reliability matters.
- Cache immutable static assets with fingerprinted names when deployed.
- Keep year payloads compact and page-specific.
- Fetch independent page datasets in parallel.
- Abort or ignore stale requests when a user changes years rapidly.
- Show a loading state without clearing the previous valid view immediately.
- Replace content only after the new payload validates.
- Preserve a useful error message and retry path on failure.
- Keep APIs versioned.
- Add security headers and a restrictive content security policy.
- Ensure a compiled or deployed artifact includes the same data files verified by tests.

## 23. Anti-patterns

Do not:

- reload the full page when a year changes;
- hard-code a list of years in the interface;
- write a sentence declaring a specific year favorable;
- highlight every positive comparison;
- use a chart only to fill empty space;
- change group colors, symbols, or line styles between pages;
- label net price as aid received;
- show a peer average when the documented statistic is a median;
- transform missing values into zero;
- hide unfavorable institutions or subgroups inside an otherwise visible section;
- mix final and provisional data without a conspicuous, justified policy;
- use a donut chart for several side-by-side compositions that users must compare;
- animate axes, labels, and page layout so aggressively that reading becomes difficult;
- add hover text that shifts or resizes the card;
- make the overview a duplicate of every detail page;
- place long methodological paragraphs above the first result;
- use tiny labels to rescue an overcrowded chart;
- imply causation from a scatterplot;
- claim statistical significance without an appropriate analysis.

## 24. Quality assurance checklist

### Data

- [ ] Every value traces to a source file and variable.
- [ ] Release type and retrieval date are recorded.
- [ ] Missing and suppressed values remain distinct from zero.
- [ ] Group membership and coverage are validated.
- [ ] Metric population, denominator, unit, and year are correct.
- [ ] Historical definitions are comparable across years.
- [ ] CSV values match the visible dashboard.

### Content

- [ ] Every title and definition is understandable without an acronym guide.
- [ ] Percentage differences use percentage points.
- [ ] Currency basis is stated.
- [ ] There is no filler, opinion, or duplicated explanation.
- [ ] Positive tags are rule-based and state an exact difference.
- [ ] Source and comparison-group links are present.

### Visual design

- [ ] Cards share the same internal alignment and spacing.
- [ ] Group colors, shapes, and line styles are consistent.
- [ ] Labels do not overlap marks, centerlines, or one another.
- [ ] The overview contains only the most important measures.
- [ ] Charts remain legible at all target widths.
- [ ] No page-level horizontal scrollbar appears.
- [ ] Logo proportions and clear space are correct.

### Interaction

- [ ] Year changes do not reload the page.
- [ ] Back and forward navigation restore the correct year.
- [ ] Section links preserve the selected year.
- [ ] Tooltips stay in the viewport and do not change layout.
- [ ] Hover and keyboard focus produce the same information.
- [ ] Trend points show a strong active outline.
- [ ] Collapse controls preserve accessible names and states.
- [ ] Rapid year changes cannot render stale data.

### Accessibility

- [ ] Keyboard-only navigation completes every task.
- [ ] Focus order is logical and focus is visible.
- [ ] Every chart has an equivalent table.
- [ ] Screen-reader names include metric, group, year, and value.
- [ ] Color contrast meets WCAG AA.
- [ ] Meaning does not depend on color.
- [ ] Reduced-motion mode removes nonessential motion.
- [ ] Content works at 200 percent zoom.

### Engineering

- [ ] Data builders and API tests pass.
- [ ] The production build succeeds from a clean checkout.
- [ ] Generated outputs are not hand edited.
- [ ] Feature flags hide whole sections only.
- [ ] New final releases can be added by one documented command.
- [ ] The deployed artifact contains the validated release catalog.

## 25. Copy-ready LLM implementation brief

Use the following block as the starting prompt for another LLM. Replace bracketed values with project-specific inputs.

```text
Build a public-facing, responsive institutional benchmarking dashboard for
[FOCUS INSTITUTION]. Use [AUTHORITATIVE DATA SOURCE] and compare the focus
institution with the configured [PEER GROUP] and [ASPIRANT GROUP].

Brand inputs:
- Full logo: [PATH OR URL]
- Compact mark: [PATH OR URL]
- Primary color: [HEX]
- Dark primary color: [HEX]
- Comparison accent: [HEX]
- Display font: [FONT WITH FALLBACK]
- Interface font: [FONT WITH FALLBACK]

Product requirements:
1. Create a concise Overview plus Access and Composition, Success and Equity,
   and Affordability sections only when data supports those questions.
2. Populate the year selector from a release catalog. Changing years must fetch
   and rerender data without reloading the page, update browser history, and
   preserve the year across navigation.
3. Keep metric definitions, units, populations, year labels, source variables,
   formatting, and favorable direction in configuration. Do not hard-code
   values or year-specific conclusions in page markup.
4. Use focus, peer, and aspirant encodings consistently. Use color plus circle,
   square, and triangle symbols, and solid, dashed, and dotted lines.
5. Choose charts by question: bullet bands for group comparisons, line charts
   for trends, 100% stacked bars for composition, centered lollipops for
   subgroup gaps, dot plots for ordered bands, and scatterplots only for a
   meaningful relationship.
6. Pair every chart with an exact-value HTML table and selected-year CSV export.
7. Use floating pointer and keyboard-focus tooltips that never alter layout.
8. Animate marks when first scrolled into view and after a year switch. Bars
   grow from their meaningful baseline, dots fade and scale in, lines fade in,
   and subgroup-gap connectors expand from zero. Respect reduced motion.
9. Show a small positive tag only when a configured higher-is-favorable or
   lower-is-favorable rule beats the peer median. State the exact difference.
   Keep every valid result visible whether tagged or not.
10. Treat missing values as unavailable, apply documented small-cohort rules,
    use final releases consistently, and retain full source provenance.
11. Use semantic HTML, keyboard-accessible SVG marks, visible focus, aria-live
    loading states, accessible collapse controls, and WCAG AA contrast.
12. Use backend feature flags for whole sections only. Never selectively hide
    institutions or subgroup values from a visible section.
13. Build a deterministic refresh script so a new validated final release can
    be downloaded, checked, transformed, tested, and exposed automatically.

Visual direction:
- restrained institutional design with white surfaces, fine gray rules, and
  generous whitespace;
- serif page titles and major values, sans-serif interface text;
- centered maximum width around 1280 px;
- two-column cards on wide screens and one column below 800 px;
- minimal shadows, no decorative gradients, no chart junk;
- stable axes and labels, with motion limited to the data marks.

Before completion, test data accuracy, mobile layouts, keyboard operation,
200% zoom, reduced motion, rapid year switching, browser back and forward,
empty and missing values, long labels, and chart-table agreement.
```

## 26. Reference implementation map

This repository demonstrates the playbook in these locations:

| Concern | Reference |
| --- | --- |
| Runtime and APIs | `dashboard/main.go` |
| Global design tokens and responsive layout | `dashboard/web/assets/dashboard.css` |
| Shared year state, tooltips, and reveal behavior | `dashboard/web/assets/dashboard.js` |
| Institution-only at-a-glance profile | `dashboard/web/marist-profile.html` and `dashboard/web/assets/marist-profile.js` |
| Overview comparison cards | `dashboard/web/assets/overview.js` |
| Composition, gaps, and scatterplots | `dashboard/web/assets/diversity-access.js` |
| Outcomes and centered subgroup gaps | `dashboard/web/assets/success-equity.js` |
| Net-price, income-band, and affordability charts | `dashboard/web/assets/affordability-resources.js` |
| Official horizontal logo | `dashboard/web/assets/marist-university-logo.png` |
| Metric semantics | `docs/metric-definitions.md` and `data/config/*.json` |
| Data and runtime architecture | `docs/architecture.md` |
| Automated annual refresh | `scripts/ipeds/refresh.py` |

This map is an example implementation, not a requirement to use the same language or chart library. The semantic contract, accessibility behavior, and integrity rules matter more than the framework.
