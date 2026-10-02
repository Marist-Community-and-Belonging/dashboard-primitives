const successPercent = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, style: "percent" });
const successPoint = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
dataTooltip();

function percent(value) {
  return Number.isFinite(value) ? successPercent.format(value / 100) : "Unavailable";
}

function points(value) {
  if (!Number.isFinite(value)) return "Unavailable";
  if (value === 0) return "0 pts";
  return `${value > 0 ? "+" : "−"}${successPoint.format(Math.abs(value))} pts`;
}

function range(summary) {
  return Number.isFinite(summary.q1) && Number.isFinite(summary.q3) ? `${percent(summary.q1)}–${percent(summary.q3)}` : "Unavailable";
}

function titleCase(value) { return value.replace(/^./, (letter) => letter.toUpperCase()); }

function addHover(selection, label) {
  selection
    .attr("tabindex", 0)
    .attr("role", "img")
    .attr("aria-label", label)
    .on("pointerenter", function (event) { d3.select(this).classed("is-active", true); showDataTooltip(label, event.clientX, event.clientY); })
    .on("pointermove", function (event) { positionDataTooltip(event.clientX, event.clientY); })
    .on("pointerleave", function () { if (document.activeElement !== this) { d3.select(this).classed("is-active", false); hideDataTooltip(); } })
    .on("focus", function () { d3.select(this).classed("is-active", true); showDataTooltipForElement(this, label); })
    .on("blur", function () { d3.select(this).classed("is-active", false); hideDataTooltip(); });
}

function renderOutcomeCard(outcome) {
  const article = document.createElement("article");
  article.className = "metric outcome-card";
  const year = outcome.cohort_year || outcome.data_year;
  article.innerHTML = `<div class="metric-header"><div><h3>${outcome.display_name}</h3><p class="metric-interpretation">${outcome.description}</p></div></div><div class="metric-result"><p class="metric-value">${percent(outcome.value)}</p><p class="metric-year">${outcome.data_year}<br>${year === outcome.data_year ? "" : year}</p></div><div class="bullet-chart outcome-chart"></div><dl class="comparison-values"><div><dt>Peer median</dt><dd>${percent(outcome.peer.median)}</dd></div><div><dt>Aspirant median</dt><dd>${percent(outcome.aspirant.median)}</dd></div></dl>`;
  document.querySelector("#outcome-grid").append(article);

  const width = 560;
  const height = 88;
  const x = d3.scaleLinear().domain([0, 100]).range([12, width - 12]);
  const svg = d3.select(article).select(".outcome-chart").append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("role", "group").attr("aria-label", `${outcome.display_name} comparison chart`);
  svg.append("line").attr("x1", x(0)).attr("x2", x(100)).attr("y1", 55).attr("y2", 55).attr("stroke", "#c9ccd1");
  const bands = [
    { summary: outcome.peer, y: 30, fill: "#858890", label: "Peer middle 50%" },
    { summary: outcome.aspirant, y: 70, fill: "#dbe9ff", stroke: "#3c8cff", label: "Aspirant middle 50%" },
  ];
  bands.forEach(({ summary, y, fill, stroke, label }) => {
    if (!Number.isFinite(summary.q1) || !Number.isFinite(summary.q3)) return;
    const mark = svg.append("g").attr("class", "chart-mark");
    mark.append("rect").attr("x", x(summary.q1)).attr("y", y - 8).attr("width", Math.max(x(summary.q3) - x(summary.q1), 2)).attr("height", 16).attr("fill", fill).attr("stroke", stroke || fill);
    mark.append("line").attr("x1", x(summary.median)).attr("x2", x(summary.median)).attr("y1", y - 12).attr("y2", y + 12).attr("stroke", stroke || "#52555d").attr("stroke-width", 2);
    addHover(mark, `${outcome.display_name}. ${label}: ${range(summary)}; median ${percent(summary.median)}.`);
  });
  if (Number.isFinite(outcome.value)) {
    const mark = svg.append("g").attr("class", "chart-mark");
    mark.append("circle").attr("cx", x(outcome.value)).attr("cy", 55).attr("r", 7).attr("fill", "#c91235").attr("stroke", "white").attr("stroke-width", 2);
    addHover(mark, `Marist ${outcome.display_name.toLowerCase()}: ${percent(outcome.value)}.`);
  }
}

function renderOutcomes(dataset) {
  document.querySelector("#outcome-grid").replaceChildren();
  document.querySelector("#outcome-table-body").replaceChildren();
  dataset.outcomes.forEach((outcome) => {
    renderOutcomeCard(outcome);
    const row = document.createElement("tr");
    row.innerHTML = `<th scope="row">${outcome.display_name}</th><td>${percent(outcome.value)}</td><td>${percent(outcome.peer.median)}</td><td>${range(outcome.peer)}</td><td>${percent(outcome.aspirant.median)}</td><td>${range(outcome.aspirant)}</td><td>${outcome.cohort_year || outcome.data_year}</td>`;
    document.querySelector("#outcome-table-body").append(row);
  });
}

function renderEquity(dataset) {
  document.querySelector("#equity-chart").replaceChildren();
  document.querySelector("#equity-table-body").replaceChildren();
  const groups = d3.group(dataset.subgroups, (item) => item.category);
  const maxGap = Math.max(20, d3.max(dataset.subgroups, (item) => Math.abs(item.gap || 0)) + 3);
  const container = d3.select("#equity-chart");
  groups.forEach((items, category) => {
    const panel = container.append("section").attr("class", `equity-group${category === "Race/ethnicity" ? " equity-group-wide" : ""}`);
    panel.append("h3").text(category);
    panel.append("p").attr("class", "equity-guide").text("Left is below Marist overall; right is above.");
    const width = 680;
    const rowHeight = 38;
    const margin = { top: 30, right: 112, bottom: 34, left: 230 };
    const height = margin.top + margin.bottom + items.length * rowHeight;
    const x = d3.scaleLinear().domain([-maxGap, maxGap]).nice().range([margin.left, width - margin.right]);
    const svg = panel.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("role", "group").attr("aria-label", `${category} six-year graduation gaps from Marist's overall ${percent(dataset.institution_rate)} rate`);
    svg.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", 22).attr("y2", height - margin.bottom).attr("stroke", "#202127").attr("stroke-width", 1.5);
    svg.append("text").attr("class", "equity-overall-label").attr("x", x(0)).attr("y", 12).attr("text-anchor", "middle").text(`Overall ${percent(dataset.institution_rate)}`);
    svg.append("text").attr("class", "equity-column-label").attr("x", width - 8).attr("y", 12).attr("text-anchor", "end").text("Rate · gap");
    let y = margin.top;
    items.forEach((item) => {
      svg.append("text").attr("class", "equity-row-label").attr("x", margin.left - 16).attr("y", y + 4).attr("text-anchor", "end").text(item.display_name);
      svg.append("line").attr("x1", x.range()[0]).attr("x2", x.range()[1]).attr("y1", y).attr("y2", y).attr("stroke", "#eceef1");
      if (Number.isFinite(item.gap)) {
        svg.append("line").attr("class", `equity-gap-bar${item.gap < 0 ? " is-negative" : ""}`).attr("x1", x(0)).attr("x2", x(item.gap)).attr("y1", y).attr("y2", y).attr("stroke", item.gap < 0 ? "#8e2038" : "#3f7771").attr("stroke-width", 3);
        const mark = svg.append("circle").attr("class", "equity-dot").attr("cx", x(item.gap)).attr("cy", y).attr("r", 7).attr("fill", item.gap < 0 ? "#c91235" : "#3f7771").attr("stroke", "white").attr("stroke-width", 2);
        addHover(mark, `${item.display_name}: ${percent(item.value)}; ${points(item.gap)} from Marist overall. Peer median ${percent(item.peer.median)}; aspirant median ${percent(item.aspirant.median)}.`);
        svg.append("text").attr("class", "equity-value-label").attr("x", width - 8).attr("y", y + 4).attr("text-anchor", "end").text(`${percent(item.value)} · ${points(item.gap)}`);
      } else {
        svg.append("text").attr("class", "equity-unavailable").attr("x", x(0) + 10).attr("y", y + 4).text("Unavailable");
      }
      y += rowHeight;
    });
    svg.append("text").attr("class", "axis-label").attr("x", x.range()[0]).attr("y", height - 8).text("Below overall");
    svg.append("text").attr("class", "axis-label").attr("x", x.range()[1]).attr("y", height - 8).attr("text-anchor", "end").text("Above overall");
  });

  dataset.subgroups.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `<th scope="row"><span class="table-category">${item.category}</span>${item.display_name}</th><td>${percent(item.value)}</td><td>${points(item.gap)}</td><td>${percent(item.peer.median)}</td><td>${percent(item.aspirant.median)}</td>`;
    document.querySelector("#equity-table-body").append(row);
  });
}

function renderPage(dataset) {
  document.querySelector("#collection-year").textContent = dataset.release.collection_year;
  document.querySelector("#institution-count").textContent = dataset.institution_count;
  document.querySelector("#release-type").textContent = titleCase(dataset.release.release_type);
  document.querySelector("#active-release").textContent = titleCase(dataset.release.release_type);
  document.querySelector("#data-status").innerHTML = `<strong>Verified dataset.</strong> Retention and graduation rates from ${dataset.release.source}; retrieved ${dataset.release.retrieved_at}.`;
  document.querySelector("#equity-description").textContent = `Each dot shows a subgroup’s difference from Marist’s ${percent(dataset.institution_rate)} institution-wide result.`;
  document.querySelector("#cohort-method").textContent = `Graduation rates describe the ${dataset.cohort_year} full-time, first-time bachelor’s cohort. Subgroup rates are descriptive and are not ranked.`;
  const query = new URLSearchParams({ year: dataset.release.collection_year });
  document.querySelector(".download-link").href = `/api/v1/success-equity/export.csv?${query}`;
  renderOutcomes(dataset);
  renderEquity(dataset);
  prepareScrollReveals(document.querySelector("main"));
}

function renderSuccessTrends(history) {
  const definitions = [
    { metric: "retention", title: "First-year retention", description: "Students returning the following fall." },
    { metric: "six_year_graduation", title: "Six-year graduation", description: "Full-time, first-time bachelor’s cohort completion." },
  ];
  const container = document.querySelector("#success-trends");
  definitions.forEach((definition) => {
    const points = history.map((dataset) => {
      const outcome = dataset.outcomes.find((item) => item.metric_id === definition.metric);
      return { year: dataset.release.collection_year, marist: outcome.value, peer: outcome.peer.median, aspirant: outcome.aspirant.median };
    });
    renderTrendChart(container, { ...definition, unit: "percent", points });
  });
  prepareScrollReveals(container);
}

async function loadSuccessYear(year) {
  const status = document.querySelector("#data-status");
  status.setAttribute("role", "status");
  try {
    status.textContent = `Loading ${year} success and equity data…`;
    const response = await fetch(`/api/v1/success-equity?${new URLSearchParams({ year })}`, { cache: "no-cache", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    renderPage(await response.json());
  } catch (error) {
    status.textContent = "The success and equity dataset is temporarily unavailable. Please try again later.";
    status.setAttribute("role", "alert");
    console.error(error);
    throw error;
  }
}

async function loadPage() {
  try {
    const catalog = await setupCollectionYearSelector(loadSuccessYear);
    await loadSuccessYear(catalog.selectedYear);
    renderSuccessTrends(await fetchDatasetHistory("/api/v1/success-equity", catalog.releases));
  } catch (error) {
    console.error(error);
  } finally {
    window.dashboardLoading?.finish();
  }
}

loadPage();
