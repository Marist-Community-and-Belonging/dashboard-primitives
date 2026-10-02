const affordabilityCurrency = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, style: "currency", currency: "USD" });
const affordabilityPercent = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, style: "percent" });
const affordabilityPoints = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const affordabilityGroups = {
  marist: { label: "Marist", color: "#c91235", symbol: d3.symbolCircle },
  peer: { label: "Peer", color: "#63666f", symbol: d3.symbolSquare },
  aspirant: { label: "Aspirant", color: "#3c8cff", symbol: d3.symbolTriangle },
};
dataTooltip();

function affordabilityValue(value, unit) {
  if (!Number.isFinite(value)) return "Unavailable";
  return unit === "usd" ? affordabilityCurrency.format(value) : affordabilityPercent.format(value / 100);
}

function affordabilityRange(summary, unit) {
  if (!Number.isFinite(summary.q1) || !Number.isFinite(summary.q3)) return "Unavailable";
  return `${affordabilityValue(summary.q1, unit)}–${affordabilityValue(summary.q3, unit)}`;
}

function affordabilityDifference(value, unit) {
  if (unit === "usd") return affordabilityCurrency.format(value);
  return `${affordabilityPoints.format(value)} ${value === 1 ? "point" : "points"}`;
}

function affordabilityTitleCase(value) { return value.replace(/^./, (letter) => letter.toUpperCase()); }

function affordabilityHover(selection, label) {
  selection.attr("tabindex", 0).attr("role", "img").attr("aria-label", label)
    .on("pointerenter", function (event) { d3.select(this).classed("is-active", true); showDataTooltip(label, event.clientX, event.clientY); })
    .on("pointermove", function (event) { positionDataTooltip(event.clientX, event.clientY); })
    .on("pointerleave", function () { if (document.activeElement !== this) { d3.select(this).classed("is-active", false); hideDataTooltip(); } })
    .on("focus", function () { d3.select(this).classed("is-active", true); showDataTooltipForElement(this, label); })
    .on("blur", function () { d3.select(this).classed("is-active", false); hideDataTooltip(); });
}

function renderAffordabilityBand(container, metric) {
  const values = [metric.value, metric.peer.q1, metric.peer.q3, metric.aspirant.q1, metric.aspirant.q3].filter(Number.isFinite);
  const domain = metric.unit === "percent" ? [0, 100] : d3.extent(values);
  const width = 560;
  const height = 88;
  const scale = d3.scaleLinear().domain(domain).nice().range([8, width - 8]);
  const svg = d3.select(container).append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("role", "group").attr("aria-label", `${metric.display_name} comparison chart`);
  svg.append("line").attr("x1", 8).attr("x2", width - 8).attr("y1", 44).attr("y2", 44).attr("stroke", "#d8dade");
  [[metric.peer, 16, "#858890", "#52555d", "Peer"], [metric.aspirant, 70, "#dbe9ff", "#236bc8", "Aspirant"]].forEach(([summary, y, fill, stroke, label]) => {
    if (!Number.isFinite(summary.q1) || !Number.isFinite(summary.q3)) return;
    const mark = svg.append("g").attr("class", "chart-mark");
    mark.append("rect").attr("x", scale(summary.q1)).attr("y", y - 5).attr("width", Math.max(3, scale(summary.q3) - scale(summary.q1))).attr("height", 10).attr("fill", fill).attr("stroke", label === "Aspirant" ? stroke : "none");
    mark.append("line").attr("x1", scale(summary.median)).attr("x2", scale(summary.median)).attr("y1", y - 9).attr("y2", y + 9).attr("stroke", stroke).attr("stroke-width", 2);
    affordabilityHover(mark, `${label} middle 50%: ${affordabilityRange(summary, metric.unit)}; median ${affordabilityValue(summary.median, metric.unit)}.`);
  });
  const marist = svg.append("circle").attr("class", "chart-mark").attr("cx", scale(metric.value)).attr("cy", 44).attr("r", 6).attr("fill", "#c91235").attr("stroke", "white").attr("stroke-width", 2);
  affordabilityHover(marist, `Marist: ${affordabilityValue(metric.value, metric.unit)}.`);
}

function renderAffordabilityHeadlines(dataset) {
  const grid = document.querySelector("#affordability-grid");
  grid.replaceChildren();
  dataset.headlines.forEach((metric) => {
    const article = document.createElement("article");
    article.className = "metric";
    article.innerHTML = `<div class="metric-header"><div><h3>${metric.display_name}</h3><p class="metric-interpretation">${metric.description}</p></div></div><div class="metric-result"><p class="metric-value">${affordabilityValue(metric.value, metric.unit)}</p><p class="metric-year">${metric.data_year}</p></div><div class="bullet-chart"></div><dl class="comparison-values"><div><dt>Peer median</dt><dd>${affordabilityValue(metric.peer.median, metric.unit)}</dd></div><div><dt>Aspirant median</dt><dd>${affordabilityValue(metric.aspirant.median, metric.unit)}</dd></div></dl>`;
    grid.append(article);
    renderAffordabilityBand(article.querySelector(".bullet-chart"), metric);
  });
}

function renderIncomeChart(dataset) {
  document.querySelector("#income-chart").replaceChildren();
  const width = 960;
  const height = 350;
  const margin = { top: 42, right: 32, bottom: 55, left: 175 };
  const allValues = dataset.income_bands.flatMap((band) => [band.marist, band.peer.median, band.aspirant.median]).filter(Number.isFinite);
  const x = d3.scaleLinear().domain(d3.extent(allValues)).nice().range([margin.left, width - margin.right]);
  const y = d3.scalePoint().domain(dataset.income_bands.map((band) => band.band_id)).range([margin.top + 24, height - margin.bottom]).padding(.4);
  const svg = d3.select("#income-chart").append("svg").attr("class", "chart-reveal").attr("viewBox", `0 0 ${width} ${height}`).attr("role", "group").attr("aria-label", "Net price by family-income band for Marist, peers, and aspirants");
  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(6).tickFormat((value) => `$${d3.format("~s")(value)}`)).call((axis) => axis.select(".domain").attr("stroke", "#aeb1b7"));
  svg.append("text").attr("class", "axis-label").attr("x", (margin.left + width - margin.right) / 2).attr("y", height - 8).attr("text-anchor", "middle").text("Average net price");
  dataset.income_bands.forEach((band) => {
    const rowY = y(band.band_id);
    svg.append("text").attr("class", "income-row-label").attr("x", margin.left - 14).attr("y", rowY + 4).attr("text-anchor", "end").text(band.display_name);
    svg.append("line").attr("x1", x.range()[0]).attr("x2", x.range()[1]).attr("y1", rowY).attr("y2", rowY).attr("stroke", "#eceef1");
    [["marist", band.marist], ["peer", band.peer.median], ["aspirant", band.aspirant.median]].forEach(([group, value]) => {
      if (!Number.isFinite(value)) return;
      const style = affordabilityGroups[group];
      const mark = svg.append("path").attr("class", "scatter-mark").attr("d", d3.symbol().type(style.symbol).size(group === "marist" ? 105 : 82)()).attr("transform", `translate(${x(value)},${rowY})`).attr("fill", style.color).attr("stroke", "white").attr("stroke-width", 1.5);
      const comparisonLabel = group === "marist" ? style.label : `${style.label} median`;
      affordabilityHover(mark, `${band.display_name}, ${comparisonLabel}: ${affordabilityCurrency.format(value)}.`);
    });
  });
  const legend = svg.append("g").attr("transform", `translate(${margin.left},18)`);
  Object.entries(affordabilityGroups).forEach(([key, style], index) => {
    legend.append("path").attr("d", d3.symbol().type(style.symbol).size(65)()).attr("transform", `translate(${index * 145},0)`).attr("fill", style.color);
    legend.append("text").attr("class", "scatter-legend-label").attr("x", index * 145 + 11).attr("y", 4).text(key === "marist" ? style.label : `${style.label} median`);
  });

  const body = document.querySelector("#income-table-body");
  body.replaceChildren();
  dataset.income_bands.forEach((band) => {
    const row = document.createElement("tr");
    row.innerHTML = `<th scope="row">${band.display_name}</th><td>${affordabilityCurrency.format(band.marist)}</td><td>${affordabilityCurrency.format(band.peer.median)}</td><td>${affordabilityCurrency.format(band.aspirant.median)}</td>`;
    body.append(row);
  });

  const lowestIncome = dataset.income_bands.find((band) => band.band_id === "income_0_30");
  document.querySelector("#income-callout").innerHTML = `<strong>Lowest income band:</strong> ${affordabilityCurrency.format(lowestIncome.marist)} average net price for families earning $30,000 or less.`;
}

function renderAffordabilityPage(dataset) {
  document.querySelector("#collection-year").textContent = dataset.release.collection_year;
  document.querySelector("#institution-count").textContent = dataset.institution_count;
  document.querySelector("#release-type").textContent = affordabilityTitleCase(dataset.release.release_type);
  document.querySelector("#active-release").textContent = affordabilityTitleCase(dataset.release.release_type);
  document.querySelector("#data-status").innerHTML = `<strong>Verified dataset.</strong> Final-release student-aid and graduation measures from ${dataset.release.source}; retrieved ${dataset.release.retrieved_at}.`;
  document.querySelector("#net-price-method").textContent = dataset.methodology.net_price;
  document.querySelector("#income-method").textContent = dataset.methodology.income_bands;
  const query = new URLSearchParams({ year: dataset.release.collection_year });
  document.querySelector(".download-link").href = `/api/v1/affordability-resources/export.csv?${query}`;
  renderAffordabilityHeadlines(dataset);
  renderIncomeChart(dataset);
  prepareScrollReveals(document.querySelector("main"));
}

function renderAffordabilityTrends(history) {
  const definitions = [
    { metric: "average_net_price", title: "Average net price", description: "Nominal dollars after grants and scholarships.", unit: "usd" },
    { metric: "pell_share", title: "Pell Grant recipient share", description: "Undergraduates receiving a federal Pell Grant.", unit: "percent" },
  ];
  const container = document.querySelector("#affordability-trends");
  definitions.forEach((definition) => {
    const points = history.map((dataset) => {
      const metric = dataset.headlines.find((item) => item.metric_id === definition.metric);
      return { year: dataset.release.collection_year, marist: metric.value, peer: metric.peer.median, aspirant: metric.aspirant.median };
    });
    renderTrendChart(container, { ...definition, points });
  });
  prepareScrollReveals(container);
}

async function loadAffordabilityYear(year) {
  const status = document.querySelector("#data-status");
  try {
    status.textContent = `Loading ${year} affordability data…`;
    const response = await fetch(`/api/v1/affordability-resources?${new URLSearchParams({ year })}`, { cache: "no-cache", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    renderAffordabilityPage(await response.json());
  } catch (error) {
    status.textContent = "The affordability dataset is temporarily unavailable. Please try again later.";
    status.setAttribute("role", "alert");
    console.error(error);
    throw error;
  }
}

async function loadAffordabilityPage() {
  try {
    const catalog = await setupCollectionYearSelector(loadAffordabilityYear);
    await loadAffordabilityYear(catalog.selectedYear);
    renderAffordabilityTrends(await fetchDatasetHistory("/api/v1/affordability-resources", catalog.releases));
  } catch (error) {
    console.error(error);
  } finally {
    window.dashboardLoading?.finish();
  }
}

loadAffordabilityPage();
