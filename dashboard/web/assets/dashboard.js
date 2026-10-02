const formatters = {
  percent: new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, style: "percent" }),
  students: new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }),
  usd: new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, style: "currency", currency: "USD" }),
};

const dashboardState = { request: 0, history: [] };
dataTooltip();

function formatValue(value, unit) {
  if (!Number.isFinite(value)) return "Unavailable";
  return unit === "percent" ? formatters.percent.format(value / 100) : formatters[unit].format(value);
}

function formatRange(summary, unit) {
  if (!Number.isFinite(summary.q1) || !Number.isFinite(summary.q3)) return "Unavailable";
  return `${formatValue(summary.q1, unit)}–${formatValue(summary.q3, unit)}`;
}

function titleCase(value) {
  return value.replace(/^./, (letter) => letter.toUpperCase());
}

function snapshotCard({ title, question, values, note, href, linkLabel }) {
  const article = document.createElement("article");
  article.className = "overview-summary";
  article.innerHTML = `<header><p>${question}</p><h3>${title}</h3></header><dl>${values.map(({ label, value }) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl><p class="overview-summary-note">${note}</p><a href="${href}">${linkLabel}</a>`;
  return article;
}

function renderDashboardSnapshot(dataset, related) {
  const snapshot = document.querySelector("#overview-snapshot");
  const metric = (id) => dataset.metrics.find((candidate) => candidate.metric_id === id);
  const enrollment = metric("undergraduate_enrollment");
  const acceptance = metric("acceptance_rate");
  const retention = metric("retention_rate");
  const graduation = metric("six_year_graduation_rate");
  const pell = metric("pell_share");
  const netPrice = metric("average_net_price");
  const maristComposition = related.diversity?.groups.find((group) => group.group === "marist");
  const underrepresentedShare = maristComposition
    ? ["black", "hispanic", "american_indian", "pacific_islander", "multiracial"].reduce((total, category) => total + (maristComposition.reported_shares[category] || 0), 0)
    : null;
  const pellGraduation = related.success?.outcomes.find((outcome) => outcome.metric_id === "pell_six_year_graduation");
  const lowestIncome = related.affordability?.income_bands[0];
  const campusAvailable = Number.isFinite(related.campus?.event_count);
  const year = encodeURIComponent(dataset.release.collection_year);
  snapshot.replaceChildren(
    snapshotCard({
      title: "Marist profile",
      question: "How large and selective is Marist?",
      values: [{ label: "Undergraduates", value: formatValue(enrollment.value, enrollment.unit) }, { label: "Acceptance rate", value: formatValue(acceptance.value, acceptance.unit) }],
      note: `${enrollment.data_year}. Enrollment and admissions are reported directly to IPEDS.`,
      href: `/marist-profile?year=${year}`,
      linkLabel: "Explore Marist profile",
    }),
    snapshotCard({
      title: "Diversity and access",
      question: "Who enrolls at Marist?",
      values: [{ label: "Pell recipients", value: formatValue(pell.value, pell.unit) }, { label: "Underrepresented minority", value: Number.isFinite(underrepresentedShare) ? formatValue(underrepresentedShare, "percent") : "Unavailable" }],
      note: maristComposition ? `${related.diversity.data_year}. Underrepresented minority combines Black, Hispanic or Latino, American Indian or Alaska Native, Native Hawaiian or Pacific Islander, and multiracial IPEDS categories.` : "Composition data unavailable for this collection.",
      href: `/diversity-access?year=${year}`,
      linkLabel: "Explore diversity and access",
    }),
    snapshotCard({
      title: "Success and equity",
      question: "How do students progress and complete?",
      values: [{ label: "First-year retention", value: formatValue(retention.value, retention.unit) }, { label: "Six-year graduation", value: formatValue(graduation.value, graduation.unit) }, { label: "Pell-recipient graduation", value: pellGraduation ? formatValue(pellGraduation.value, "percent") : "Unavailable" }],
      note: `${graduation.cohort_year}. Graduation rates follow the entering cohort; subgroup rates are descriptive.`,
      href: `/success-equity?year=${year}`,
      linkLabel: "Explore success and equity",
    }),
    snapshotCard({
      title: "Affordability",
      question: "What remains after grants and scholarships?",
      values: [{ label: "Average net price", value: formatValue(netPrice.value, netPrice.unit) }, { label: lowestIncome?.display_name || "Lowest income band", value: lowestIncome ? formatValue(lowestIncome.marist, "usd") : "Unavailable" }],
      note: `${netPrice.data_year}. Income-band values cover Title IV aid recipients.`,
      href: `/affordability-resources?year=${year}`,
      linkLabel: "Explore affordability",
    }),
    snapshotCard({
      title: "Campus involvement",
      question: "What is happening on campus?",
      values: [{ label: "Listed events", value: campusAvailable ? formatters.students.format(related.campus.event_count) : "Unavailable" }, { label: "Active dates", value: campusAvailable ? formatters.students.format(related.campus.days.length) : "Unavailable" }],
      note: campusAvailable ? "Current public CampusGroups feed. Event data are separate from IPEDS and may change throughout the day." : "Current event feed unavailable. Missing events are not shown as zero.",
      href: "/campus-involvement",
      linkLabel: "Explore campus involvement",
    }),
  );
}

function renderOverviewTrends() {
  const container = document.querySelector("#overview-trends");
  if (!dashboardState.history.length) return;
  container.replaceChildren();
  [
    { id: "retention_rate", title: "First-year retention", description: "Share of full-time, first-time students returning the following fall." },
    { id: "average_net_price", title: "Average net price", description: "Nominal annual cost after grants and scholarships for aided full-time, first-time students." },
  ].forEach((config) => {
    const metrics = dashboardState.history.map((dataset) => dataset.metrics.find((metric) => metric.metric_id === config.id));
    if (metrics.some((metric) => !metric)) return;
    renderTrendChart(container, {
      title: config.title,
      description: config.description,
      unit: metrics[0].unit,
      points: dashboardState.history.map((dataset, index) => ({
        year: dataset.release.collection_year,
        marist: metrics[index].value,
        peer: metrics[index].peer.median,
        aspirant: metrics[index].aspirant.median,
      })),
    });
  });
}

function metricCard(metric) {
  const article = document.createElement("article");
  article.className = "metric";
  if (!Number.isFinite(metric.value)) article.classList.add("metric-unavailable");
  article.innerHTML = `
    <header class="metric-header">
      <div><h3>${metric.display_name}</h3><p class="metric-interpretation">${metric.description}</p></div>
    </header>
    <div class="metric-result">
      <p class="metric-value">${formatValue(metric.value, metric.unit)}</p>
      <p class="metric-year">${metric.data_year}${metric.cohort_year ? `<br>${metric.cohort_year}` : ""}</p>
    </div>
    <div class="bullet-chart"></div>
    <dl class="comparison-values">
      <div><dt>Peer median · ${metric.peer.count} institutions</dt><dd>${formatValue(metric.peer.median, metric.unit)}</dd></div>
      <div><dt>Aspirant median · ${metric.aspirant.count} institutions</dt><dd>${formatValue(metric.aspirant.median, metric.unit)}</dd></div>
    </dl>
    <details class="metric-details"><summary>Definition and source</summary><p>${metric.interpretation} Status: ${Number.isFinite(metric.value) ? "reported" : titleCase(metric.status_flag || "unavailable")}. Source: ${metric.source_component}, variable ${metric.source_variable}.</p></details>`;
  return article;
}

function renderBullet(container, metric) {
  const values = metric.institutions.map((institution) => institution.value).filter(Number.isFinite);
  if (values.length === 0) {
    container.classList.add("chart-unavailable");
    container.textContent = "Chart unavailable for this collection year.";
    return;
  }

  const domain = metric.unit === "percent" ? [0, 100] : d3.extent(values);
  if (domain[0] === domain[1]) domain[1] = domain[0] + 1;
  const width = 560;
  const height = 108;
  const scale = d3.scaleLinear().domain(domain).nice().range([8, width - 8]);
  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "group")
    .attr("aria-label", `${metric.display_name} comparison chart`);

  svg.append("line").attr("x1", 8).attr("x2", width - 8).attr("y1", 44).attr("y2", 44).attr("stroke", "#d8dade");
  svg.append("text").attr("class", "bullet-scale-label").attr("x", 8).attr("y", 102).text(formatValue(domain[0], metric.unit));
  svg.append("text").attr("class", "bullet-scale-label").attr("x", width - 8).attr("y", 102).attr("text-anchor", "end").text(formatValue(domain[1], metric.unit));
  function interactiveMark(selection, label) {
    selection
      .attr("class", "chart-mark")
      .attr("tabindex", 0)
      .attr("role", "img")
      .attr("aria-label", label)
      .on("pointerenter", function (event) {
        svg.selectAll(".chart-mark").classed("is-active", false);
        d3.select(this).classed("is-active", true);
        showDataTooltip(label, event.clientX, event.clientY);
      })
      .on("pointermove", function (event) {
        positionDataTooltip(event.clientX, event.clientY);
      })
      .on("pointerleave", function () {
        if (document.activeElement === this) return;
        d3.select(this).classed("is-active", false);
        hideDataTooltip();
      })
      .on("focus", function () {
        svg.selectAll(".chart-mark").classed("is-active", false);
        d3.select(this).classed("is-active", true);
        showDataTooltipForElement(this, label);
      })
      .on("blur", function () {
        d3.select(this).classed("is-active", false);
        hideDataTooltip();
      });
  }

  if (Number.isFinite(metric.peer.q1) && Number.isFinite(metric.peer.q3)) {
    const peerLabel = `Peer middle 50%: ${formatRange(metric.peer, metric.unit)}; median ${formatValue(metric.peer.median, metric.unit)}.`;
    const peer = svg.append("g");
    peer.append("rect").attr("x", scale(metric.peer.q1)).attr("y", 12).attr("width", Math.max(3, scale(metric.peer.q3) - scale(metric.peer.q1))).attr("height", 10).attr("fill", "#858890");
    peer.append("line").attr("x1", scale(metric.peer.median)).attr("x2", scale(metric.peer.median)).attr("y1", 8).attr("y2", 26).attr("stroke", "#52555d").attr("stroke-width", 2);
    interactiveMark(peer, peerLabel);
  }

  if (Number.isFinite(metric.value)) {
    const maristLabel = `Marist: ${formatValue(metric.value, metric.unit)}.`;
    const marist = svg.append("g");
    marist.append("circle").attr("cx", scale(metric.value)).attr("cy", 44).attr("r", 6).attr("fill", "#c91235").attr("stroke", "white").attr("stroke-width", 2);
    interactiveMark(marist, maristLabel);
  }

  if (Number.isFinite(metric.aspirant.q1) && Number.isFinite(metric.aspirant.q3)) {
    const aspirantLabel = `Aspirant middle 50%: ${formatRange(metric.aspirant, metric.unit)}; median ${formatValue(metric.aspirant.median, metric.unit)}.`;
    const aspirant = svg.append("g");
    aspirant.append("rect").attr("x", scale(metric.aspirant.q1)).attr("y", 66).attr("width", Math.max(3, scale(metric.aspirant.q3) - scale(metric.aspirant.q1))).attr("height", 10).attr("fill", "#dbe9ff").attr("stroke", "#3c8cff");
    aspirant.append("line").attr("x1", scale(metric.aspirant.median)).attr("x2", scale(metric.aspirant.median)).attr("y1", 62).attr("y2", 80).attr("stroke", "#236bc8").attr("stroke-width", 2);
    interactiveMark(aspirant, aspirantLabel);
  }
}

function renderDataset(dataset, related) {
  document.querySelector("#collection-year").textContent = dataset.release.collection_year;
  document.querySelector("#institution-count").textContent = dataset.institution_count;
  document.querySelector("#release-type").textContent = titleCase(dataset.release.release_type);
  document.querySelector("#active-release").textContent = titleCase(dataset.release.release_type);
  document.querySelector("#active-filter").textContent = `Showing ${dataset.release.collection_year} ${dataset.release.release_type} data`;
  document.querySelector("#data-status").innerHTML = `<strong>Verified final IPEDS data.</strong> Retrieved ${dataset.release.retrieved_at}.`;
  document.querySelector("#data-provenance").textContent = `${dataset.release.source}. Retrieved ${dataset.release.retrieved_at}. Peer medians use ${dataset.metrics[0].peer.count} institutions; aspirant medians use ${dataset.metrics[0].aspirant.count}. Marist is excluded from both groups.`;
  renderDashboardSnapshot(dataset, related);

  const grid = document.querySelector("#metric-grid");
  grid.replaceChildren();
  dataset.metrics.forEach((metric) => {
    const card = metricCard(metric);
    grid.append(card);
    renderBullet(card.querySelector(".bullet-chart"), metric);
  });

  const query = new URLSearchParams({ year: dataset.release.collection_year });
  document.querySelector(".download-link").href = `/api/v1/export.csv?${query}`;
  prepareScrollReveals(grid);
  renderOverviewTrends();
}

async function loadYear(year) {
  const status = document.querySelector("#data-status");
  const request = ++dashboardState.request;
  status.textContent = `Loading ${year} IPEDS comparison data…`;
  try {
    const query = new URLSearchParams({ year });
    const response = await fetch(`/api/v1/overview?${query}`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    const dataset = await response.json();
    const optionalDataset = async (endpoint) => {
      try {
        const optionalResponse = await fetch(`${endpoint}?${query}`, { headers: { Accept: "application/json" } });
        return optionalResponse.ok ? optionalResponse.json() : null;
      } catch (_) {
        return null;
      }
    };
    const [diversity, success, affordability, campus] = await Promise.all([
      optionalDataset("/api/v1/diversity-access"),
      optionalDataset("/api/v1/success-equity"),
      optionalDataset("/api/v1/affordability-resources"),
      optionalDataset("/api/v1/campus-involvement/events"),
    ]);
    if (request === dashboardState.request) renderDataset(dataset, { diversity, success, affordability, campus });
  } catch (error) {
    if (request !== dashboardState.request) return;
    status.textContent = "The comparison dataset is temporarily unavailable. Please try again later.";
    status.setAttribute("role", "alert");
    console.error(error);
    throw error;
  }
}

async function loadDashboard() {
  const status = document.querySelector("#data-status");
  try {
    const catalog = await setupCollectionYearSelector(loadYear);
    dashboardState.history = await fetchDatasetHistory("/api/v1/overview", catalog.releases);
    await loadYear(catalog.selectedYear);
  } catch (error) {
    status.textContent = "The comparison dataset is temporarily unavailable. Please try again later.";
    status.setAttribute("role", "alert");
    console.error(error);
  } finally {
    window.dashboardLoading?.finish();
  }
}

loadDashboard();
