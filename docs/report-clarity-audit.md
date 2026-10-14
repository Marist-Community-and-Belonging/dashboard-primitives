# Dashboard and PDF clarity audit

Audit date: October 14, 2026

Scope: all six public dashboard pages, five IPEDS collection choices, CSV exports, and the generated 2023-24 PDF. Review covered required viewport widths (320, 375, 768, 1024, 1280, and 1440 CSS pixels), keyboard use, 200% zoom, reduced motion, year history, rapid year changes, horizontal scrolling, missing values, console output, page overflow, and PDF page rendering.

## High priority

### 1. Peer and aspirant groups lacked a plain-language purpose

- **What a layperson may think or ask:** Are peers similar schools, competitors, or a ranking? Are aspirants goals Marist expects to reach?
- **Why the presentation may fail:** Pages named both groups but only said one was primary and one was additional. The PDF gave counts without explaining why both groups appear.
- **Smallest complete improvement:** Define peers as Marist's primary official comparison group and aspirants as a second official point of reference. State that neither group is a ranking or prediction. Link the official membership list near the first comparison.
- **Affected areas:** Overview, Diversity and Access, Success and Equity, Affordability, and PDF introduction.
- **Oversimplification or bias risk:** Official selection criteria may contain more nuance than a short label. Keep the authoritative membership link and avoid claims about why any institution was selected.
- **Resolution:** Implemented.

### 2. PDF assigned unsupported direction to every overview metric

- **What a layperson may think or ask:** Does higher enrollment or a higher acceptance rate always mean better performance?
- **Why the presentation may fail:** The PDF said higher was favorable except for net price. That value judgment was not supported for enrollment or admission rate and could turn descriptive comparisons into implied rankings.
- **Smallest complete improvement:** Replace the blanket direction statement with: comparisons are descriptive, and higher or lower is not automatically better.
- **Affected areas:** PDF Overview.
- **Oversimplification or bias risk:** Removing the blanket rule gives less evaluative guidance, but it avoids unsupported claims. Metric-specific interpretation can still use documented rules.
- **Resolution:** Implemented.

### 3. IPEDS and collection timing required too much prior knowledge

- **What a layperson may think or ask:** Is 2023-24 the year every value was measured? Why does a 2023-24 page show a 2017 entering cohort or 2022-23 net price?
- **Why the presentation may fail:** The explanation appeared late in methodology, and IPEDS was not expanded. Readers could compare values as if they covered one shared period.
- **Smallest complete improvement:** Expand IPEDS once. Explain that collection names a federal release, not one measurement period, and that each measure identifies its fall term, academic year, or entering cohort.
- **Affected areas:** Overview methodology and PDF introduction; all metric and report captions retain exact periods.
- **Oversimplification or bias risk:** A short explanation cannot replace each IPEDS survey component's reporting rules. Exact period labels and source references remain authoritative.
- **Resolution:** Implemented.

## Medium priority

### 4. Core comparison detail is collapsed on the Overview by default

- **What a layperson may think or ask:** Where is the evidence for how Marist compares?
- **Why the presentation may fail:** The opening snapshot shows Marist values, while peer and aspirant bands require expanding "Explore all measures."
- **Smallest complete improvement:** Keep the concise snapshot, but consider opening the comparison section by default after observing real user behavior.
- **Affected areas:** Overview.
- **Oversimplification or bias risk:** Expanding six comparison cards makes the overview longer and may bury its cross-section summary.
- **Resolution:** Intentionally unchanged; current toggle is clear and preserves the design system's short overview.

### 5. PDF source codes compete with the story

- **What a layperson may think or ask:** What do `DRVGR2023 GBA6RTT` and similar codes mean?
- **Why the presentation may fail:** Raw component and variable codes follow several narrative captions. They support provenance but interrupt nontechnical reading.
- **Smallest complete improvement:** Keep plain-language period and population text with each figure; move codes to the References table only.
- **Affected areas:** PDF Overview and References.
- **Oversimplification or bias risk:** Removing codes from captions could make figure-level traceability slower. References must preserve an unambiguous mapping.
- **Resolution:** Not changed; report generator package owns caption layout.

### 6. Some statistical terms were accurate but not translated

- **What a layperson may think or ask:** Is the middle 50% an error range? What is a percentage point? Are dollar trends adjusted for inflation?
- **Why the presentation may fail:** "Middle ranges," "pts," and "nominal" can be read incorrectly.
- **Smallest complete improvement:** Use "middle 50%" consistently; define a percentage-point gap with arithmetic; state that nominal dollars are not inflation adjusted; describe the median as the middle institution and mean as the average.
- **Affected areas:** Overview, Success and Equity, Affordability, and PDF comparison-band guide.
- **Oversimplification or bias risk:** Mean and median definitions do not describe every distribution property. Exact values and group counts remain available.
- **Resolution:** Implemented for explanatory copy. Compact chart labels remain abbreviated where space is limited.

### 7. Enrollment-weighted aggregates remain technical

- **What a layperson may think or ask:** Is a peer aggregate the average school or the average student?
- **Why the presentation may fail:** The dashboard says composition shares are enrollment-weighted but does not immediately say that larger institutions contribute more.
- **Smallest complete improvement:** Add that one plain-language sentence beside the composition methodology.
- **Affected areas:** Diversity and Access dashboard and PDF.
- **Oversimplification or bias risk:** "Larger institutions contribute more" is accurate but still does not describe every category denominator.
- **Resolution:** Deferred to the shared data/report wording source to avoid duplicating methodology.

### 8. PDF comparison bands do not print their quartile endpoints

- **What a layperson may think or ask:** What are the exact low and high values of the shaded middle half?
- **Why the presentation may fail:** The PDF labels median and mean but requires visual estimation of the band endpoints.
- **Smallest complete improvement:** Add Q1 and Q3 values to a compact appendix table or figure caption.
- **Affected areas:** PDF Overview and outcome bullets.
- **Oversimplification or bias risk:** More numbers may overwhelm the main report. An appendix is preferable to denser charts.
- **Resolution:** Deferred; website exact-value tables and CSV exports provide the endpoints.

### 9. Keyboard tooltips could not be dismissed with Escape

- **What a layperson may think or ask:** How do I close the floating value without moving focus away from the chart?
- **Why the presentation may fail:** Focus correctly opened the tooltip, but Escape did not hide it as required by the interaction specification.
- **Smallest complete improvement:** Add one shared Escape handler to the tooltip utility.
- **Affected areas:** Keyboard-focus tooltips on all charts.
- **Oversimplification or bias risk:** None; focus remains on the chart mark so keyboard position is preserved.
- **Resolution:** Implemented.

## Low priority

### 10. Compact gap labels use "pts"

- **What a layperson may think or ask:** Does "pts" mean points, percentage points, or a score?
- **Why the presentation may fail:** The abbreviation saves space but depends on nearby methodology.
- **Smallest complete improvement:** Use "pp" only after a visible definition, or use "percentage points" in tables and accessible labels.
- **Affected areas:** Success and Equity gap chart and exact table.
- **Oversimplification or bias risk:** Full wording can collide with long subgroup labels on small screens.
- **Resolution:** Explanation added; compact labels unchanged.

### 11. Source and membership links leave the dashboard without warning

- **What a layperson may think or ask:** Will this open an official source or replace my dashboard page?
- **Why the presentation may fail:** Link text identifies the destination but not its navigation behavior.
- **Smallest complete improvement:** Keep descriptive link text; add new-tab behavior only if user research shows loss of place is common.
- **Affected areas:** Methodology and comparison-group links.
- **Oversimplification or bias risk:** New tabs can be more disruptive for keyboard and mobile users.
- **Resolution:** Intentionally unchanged.

## Already strong

### 12. Exact values never depend on hover

- **What a layperson may think or ask:** Can I verify a chart without precise pointer control?
- **Why it works:** Focusable marks expose labels, disclosures contain real tables, and CSV downloads preserve exact values.
- **Smallest complete improvement:** None.
- **Affected areas:** All data pages and exports.
- **Oversimplification or bias risk:** None identified.

### 13. Missing values remain distinct from zero

- **What a layperson may think or ask:** Does a blank mark mean nobody was reported?
- **Why it works:** Formatters render `Unavailable`; subgroup charts label unavailable values; methodology says missing or suppressed values are never zero.
- **Smallest complete improvement:** None.
- **Affected areas:** Success and Equity, overview metrics, tables, and PDF introduction.
- **Oversimplification or bias risk:** Readers still cannot distinguish missing from suppressed when source data do not expose that distinction.

### 14. Responsive containment and interaction cues work

- **What a layperson may think or ask:** Can I reach the rest of a wide chart or table?
- **Why it works:** Wide content scrolls inside its own container, gains keyboard focus, and shows a swipe cue. No tested page produced page-level horizontal overflow.
- **Smallest complete improvement:** None.
- **Affected areas:** Navigation, trends, income chart, equity chart, and exact-value tables.
- **Oversimplification or bias risk:** A full-page screenshot does not trigger below-fold reveal animations; real scrolling does.

### 15. The interface separates description from causation and ranking

- **What a layperson may think or ask:** Does a difference prove Marist caused an outcome or ranks above another school?
- **Why it works:** Page and chart copy repeatedly labels trends and subgroup comparisons as descriptive, omits trend lines from the scatterplot, and disclaims composite rankings.
- **Smallest complete improvement:** None.
- **Affected areas:** Overview, Diversity and Access, Success and Equity, and PDF.
- **Oversimplification or bias risk:** Readers can still infer causation from any comparison; neutral copy reduces but cannot eliminate that risk.

### 16. Year changes protect against stale data

- **What a layperson may think or ask:** Did every chart update to the selected collection?
- **Why it works:** Each page tracks the newest request, ignores older responses, updates URL history, disables the selector during committed changes, and restores the prior year on failure.
- **Smallest complete improvement:** None.
- **Affected areas:** All five IPEDS data pages.
- **Oversimplification or bias risk:** Network behavior varies; browser checks still need to accompany release changes.

### 17. PDF works as a standalone report

- **What a layperson may think or ask:** Can I understand this without opening the site?
- **Why it works:** The ten-page report has a cover, contents, overview, profile, trends, topic chapters, sources, page numbers, exact periods, and consistent group encoding.
- **Smallest complete improvement:** Preserve this structure.
- **Affected areas:** Generated PDF.
- **Oversimplification or bias risk:** Exact band endpoints remain easier to obtain from website tables or CSV.

## Verification

- All six public pages passed at 320, 375, 768, 1024, 1280, and 1440 CSS pixels with no page-level horizontal overflow or browser console warnings/errors.
- Keyboard focus, skip navigation, chart tooltip access and Escape dismissal, contained table scrolling, year history, rapid year switching, unavailable values, and request-failure recovery passed.
- A 640 CSS-pixel viewport reproduced a 1280-pixel display at 200% zoom without overflow. The in-app browser could not directly set its native zoom level.
- Reduced-motion CSS and JavaScript paths were inspected; the in-app browser could not emulate the media preference at runtime.
- The generated tagged, letter-size PDF remained ten pages. All pages were rendered and visually checked for clipping, overlap, and page-break failures.
- `go test -race -cover ./...` passed at 67.3% statement coverage; `go vet ./...`, a clean Go build, 23 Python tests, every JavaScript syntax check, the calendar JavaScript validation, and `git diff --check` passed.
