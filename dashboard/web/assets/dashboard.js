const formatters = {
  percent: new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, style: "percent" }),
  students: new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }),
  usd: new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, style: "currency", currency: "USD" }),
};

const dashboardState = { request: 0 };
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

function successPointLabel(value) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)} ${value === 1 ? "point" : "points"}`;
}

function formatComparisonDifference(value, unit) {
  return unit === "percent" ? successPointLabel(value) : formatValue(value, unit);
}

function metricCard(metric) {
  const article = document.createElement("article");
  article.className = "metric";
  if (!Number.isFinite(metric.value)) article.classList.add("metric-unavailable");
  const favorable = applyFavorableHighlight(article, metric);

  article.innerHTML = `
    <header class="metric-header">
      <div><h3>${metric.display_name}</h3><p class="metric-interpretation">${metric.interpretation}</p></div>
    </header>
    <div class="metric-result">
      <p class="metric-value">${formatValue(metric.value, metric.unit)}</p>
      <p class="metric-year">${metric.data_year}${metric.cohort_year ? `<br>${metric.cohort_year}` : ""}</p>
    </div>
    <div class="metric-callout-slot">${favorable ? `<p class="metric-callout">${formatComparisonDifference(favorable.difference, metric.unit)} ${favorable.position} peer median</p>` : ""}</div>
    <div class="bullet-chart"></div>
    <dl class="comparison-values">
      <div><dt>Peer median</dt><dd>${formatValue(metric.peer.median, metric.unit)}</dd></div>
      <div><dt>Aspirant median</dt><dd>${formatValue(metric.aspirant.median, metric.unit)}</dd></div>
    </dl>`;
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
  const height = 88;
  const scale = d3.scaleLinear().domain(domain).nice().range([8, width - 8]);
  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "group")
    .attr("aria-label", `${metric.display_name} comparison chart`);

  svg.append("line").attr("x1", 8).attr("x2", width - 8).attr("y1", 44).attr("y2", 44).attr("stroke", "#d8dade");
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

function tableRow(metric) {
  const row = document.createElement("tr");
  row.innerHTML = `<td>${metric.display_name}</td><td>${formatValue(metric.value, metric.unit)}</td><td>${formatValue(metric.peer.median, metric.unit)}</td><td>${formatRange(metric.peer, metric.unit)}</td><td>${formatValue(metric.aspirant.median, metric.unit)}</td><td>${formatRange(metric.aspirant, metric.unit)}</td><td>${metric.data_year}</td>`;
  return row;
}

function renderDataset(dataset) {
  document.querySelector("#collection-year").textContent = dataset.release.collection_year;
  document.querySelector("#institution-count").textContent = dataset.institution_count;
  document.querySelector("#release-type").textContent = titleCase(dataset.release.release_type);
  document.querySelector("#active-release").textContent = titleCase(dataset.release.release_type);
  document.querySelector("#active-filter").textContent = `Showing ${dataset.release.collection_year} ${dataset.release.release_type} data`;
  document.querySelector("#data-status").innerHTML = `<strong>Verified final IPEDS data.</strong> Retrieved ${dataset.release.retrieved_at}.`;

  const grid = document.querySelector("#metric-grid");
  const tableBody = document.querySelector("#comparison-table-body");
  grid.replaceChildren();
  tableBody.replaceChildren();
  dataset.metrics.forEach((metric) => {
    const card = metricCard(metric);
    grid.append(card);
    renderBullet(card.querySelector(".bullet-chart"), metric);
    tableBody.append(tableRow(metric));
  });

  const query = new URLSearchParams({ year: dataset.release.collection_year });
  document.querySelector(".download-link").href = `/api/v1/export.csv?${query}`;
  prepareScrollReveals(grid);
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
    if (request === dashboardState.request) renderDataset(dataset);
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
    await loadYear(catalog.selectedYear);
  } catch (error) {
    status.textContent = "The comparison dataset is temporarily unavailable. Please try again later.";
    status.setAttribute("role", "alert");
    console.error(error);
  }
}

loadDashboard();
