# Metric definitions

This semantic layer records the exact meaning of every dashboard metric. The dashboard uses five final IPEDS collections from 2019–20 through 2023–24. Release metadata and checksums are versioned in `data/config/ipeds-releases.json`.

| Metric | Source | Variable | Population and definition | Unit | Missing behavior |
| --- | --- | --- | --- | --- | --- |
| Undergraduate enrollment | Annual DRVEF | `EFUG` | Undergraduate students enrolled in the collection’s fall term | Students | Unavailable when blank, dot, or negative sentinel |
| Acceptance rate | Annual DRVADM | `DVADM01` | Percent of all applicants admitted for the collection’s fall term | Percent | Unavailable when blank, dot, or negative sentinel |
| First-year retention rate | Annual EF Part D | `RET_PCF` | Full-time first-time degree/certificate-seeking undergraduate retention rate | Percent | Unavailable when blank, dot, or negative sentinel |
| Six-year graduation rate | Annual DRVGR | `GBA6RTT` | Bachelor’s degree within six years for the collection’s applicable entering cohort | Percent | Unavailable when blank, dot, or negative sentinel |
| Average net price | Annual SFA | `NPGRN2` | Average net price for full-time, first-time degree/certificate-seeking undergraduates awarded grant or scholarship aid at degree-granting institutions | USD | Unavailable when blank, dot, or negative sentinel |
| Pell Grant recipient share | Annual SFA | `UPGRNTP` | Percent of undergraduate students awarded Federal Pell Grants | Percent | Unavailable when blank, dot, or negative sentinel |

For institutions reporting a full academic year, average net price subtracts average federal, state/local, and institutional grant and scholarship aid from total cost of attendance. Total cost includes published tuition and required fees, books and supplies, and weighted-average room, board, and other expenses. The displayed measure applies to full-time, first-time degree/certificate-seeking undergraduates who received qualifying grant or scholarship aid.

The final Access SFA tables do not include the provisional component files’ item-level `XNPGRN2` and `XUPGRNTP` flags. Those flags remain unavailable rather than being mixed across release types.

Peer and aspirant comparisons use the institution-level median and inclusive interquartile range. Marist is excluded because group membership is mutually exclusive. Combined student-population composition measures will use weighted aggregation and will be labeled separately.

Positive tags are rule-based rather than hand-written for a particular year. Retention, graduation, and Pell participation treat higher values as favorable; net-price measures treat lower values as favorable. A tag appears only when Marist compares favorably with the peer median and states the exact difference. Enrollment and acceptance rate have no favorable direction because size and selectivity are not inherently better or worse. All results remain visible whether or not they receive a tag.

## Diversity & Access

The 2021–22 through 2023–24 extracts use final derived enrollment shares. The 2019–20 and 2020–21 extracts calculate the same shares from final EF Part A counts. Peer and aspirant composition is enrollment-weighted, and stacked-bar widths are normalized to 100% to absorb rounding.

| Measure | Source | Variable | Population and definition | Unit |
| --- | --- | --- | --- | --- |
| Race/ethnicity composition | Annual DRVEF | `PCUENRWH`, `PCUENRBK`, `PCUENRHS`, `PCUENRAS`, `PCUENRNH`, `PCUENRAN`, `PCUENR2M`, `PCUENRUN`, `PCUENRNR` | Fall undergraduate enrollment in the applicable IPEDS categories | Percent |
| Reported sex distribution | Annual DRVEF | `PCUENRW`; men calculated as `100 - PCUENRW` | Fall undergraduate enrollment; the derived files report women and men for these vintages | Percent |
| International/nonresident share | Annual DRVEF | `PCUENRNR` | Fall undergraduates reported as U.S. nonresident | Percent |
| Pell Grant recipient share | Annual SFA | `UPGRNTP` | Undergraduate students awarded Federal Pell Grants | Percent |
| Diversity index | Derived from the composition variables above | `1 - sum(normalized_share²)` | Probability that two randomly selected undergraduates are reported in different IPEDS race/ethnicity categories | Proportion |
| Six-year graduation rate | Annual DRVGR | `GBA6RTT` | Bachelor’s degree within six years for the collection’s applicable entering cohort | Percent |

Representation gaps subtract the peer or aspirant institution median from Marist’s share. The scatterplot uses institution-level diversity index and graduation rate, with fall undergraduate enrollment as bubble size. The five-year trend compares institution-level diversity-index medians.

## Success & Equity

Success & Equity uses final graduation rates for the applicable full-time, first-time bachelor’s cohort in each collection. A subgroup gap is the subgroup rate minus Marist’s institution-wide six-year rate, in percentage points.

| Measure | Source | Variable | Population and definition | Unit |
| --- | --- | --- | --- | --- |
| First-year retention | Annual EF Part D | `RET_PCF` | Full-time, first-time degree/certificate-seeking undergraduates returning the following fall | Percent |
| Four-year graduation | Annual DRVGR | `GBA4RTT` | Bachelor’s degree within four years for the collection’s applicable entering cohort | Percent |
| Six-year graduation | Annual DRVGR | `GBA6RTT` | Bachelor’s degree within six years for the collection’s applicable entering cohort | Percent |
| Six-year graduation by reported sex | Annual DRVGR | `GBA6RTM`, `GBA6RTW` | Men and women in the same bachelor’s cohort | Percent |
| Six-year graduation by race/ethnicity | Annual DRVGR | `GBA6RTAN`, `GBA6RTAS`, `GBA6RTNH`, `GBA6RTBK`, `GBA6RTHS`, `GBA6RTWH`, `GBA6RT2M`, `GBA6RTUN`, `GBA6RTNR` | Applicable IPEDS race/ethnicity categories in the same bachelor’s cohort | Percent |
| Six-year graduation by aid status | Annual DRVGR | `PGBA6RT`, `SSBA6RT`, `NRBA6RT` | Pell recipients, subsidized-loan recipients, and students receiving neither in the same bachelor’s cohort | Percent |

Pell-recipient six-year graduation is also shown as a headline Success & Equity comparison because it uses the same cohort definition across Marist, peers, and aspirants and adds a socioeconomic-equity outcome to the overall retention and completion measures.

The final derived table contains these rates but not the subgroup numerators and denominators. Count fields therefore remain explicitly unavailable. The configured small-cohort rule is to suppress a subgroup rate below a denominator of 10 once the raw final cohort counts are available; until then, the dashboard makes no subgroup rankings or tiny-cohort claims. Missing published rates remain unavailable rather than becoming zero.

## Affordability

Affordability uses final Student Financial Aid tables for each collection. Dollar trends are shown in nominal dollars.

| Measure | Source | Variable | Population and definition | Unit |
| --- | --- | --- | --- | --- |
| Average net price | Annual SFA | `NPGRN2` | Full-time, first-time degree/certificate-seeking undergraduates awarded grant or scholarship aid | USD |
| Net price, income $0 to $30,000 | Annual SFA | `NPT412` | Full-time, first-time students awarded Title IV federal aid in the stated family-income band | USD |
| Net price, income $30,001 to $48,000 | Annual SFA | `NPT422` | Same population for the stated family-income band | USD |
| Net price, income $48,001 to $75,000 | Annual SFA | `NPT432` | Same population for the stated family-income band | USD |
| Net price, income $75,001 to $110,000 | Annual SFA | `NPT442` | Same population for the stated family-income band | USD |
| Net price, income over $110,000 | Annual SFA | `NPT452` | Same population for the stated family-income band | USD |
| Pell Grant recipient share | Annual SFA | `UPGRNTP` | Undergraduate students awarded Federal Pell Grants | Percent |
