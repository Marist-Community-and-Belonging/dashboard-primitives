const trendFormatters = {
  percent: new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, style: "percent" }),
  usd: new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, style: "currency", currency: "USD" }),
  index: new Intl.NumberFormat("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
};

async function fetchDatasetHistory(endpoint, releases, selectedDataset = null) {
  return Promise.all(releases
    .slice()
    .sort((left, right) => left.collection_year.localeCompare(right.collection_year))
    .map(async (release) => {
      if (selectedDataset?.release.collection_year === release.collection_year) return selectedDataset;
      const query = new URLSearchParams({ year: release.collection_year });
      const response = await fetch(`${endpoint}?${query}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`History request failed with ${response.status}`);
      return response.json();
    }));
}

function trendValue(value, unit) {
  if (!Number.isFinite(value)) return "Unavailable";
  if (unit === "percent") return trendFormatters.percent.format(value / 100);
  return trendFormatters[unit].format(value);
}

function renderTrendChart(container, options) {
  const article = document.createElement("article");
  article.className = "trend-card";
  article.innerHTML = `<div class="trend-heading"><h3>${options.title}</h3><p>${options.description}</p></div><div class="trend-visual"></div>`;
  container.append(article);

  const width = 760;
  const height = 300;
  const margin = { top: 30, right: 120, bottom: 52, left: options.unit === "usd" ? 78 : 58 };
  const groups = [
    { key: "marist", label: "Marist", color: "#c91235", dash: null, symbol: d3.symbolCircle },
    { key: "peer", label: "Peer median", color: "#63666f", dash: "6 4", symbol: d3.symbolSquare },
    { key: "aspirant", label: "Aspirant median", color: "#3c8cff", dash: "2 4", symbol: d3.symbolTriangle },
  ];
  const selectedYear = new URLSearchParams(window.location.search).get("year");
  const values = options.points.flatMap((point) => groups.map((group) => point[group.key])).filter(Number.isFinite);
  const extent = d3.extent(values);
  const padding = Math.max((extent[1] - extent[0]) * .16, options.unit === "index" ? .015 : options.unit === "percent" ? 2 : 1000);
  const y = d3.scaleLinear().domain([extent[0] - padding, extent[1] + padding]).nice().range([height - margin.bottom, margin.top]);
  const x = d3.scalePoint().domain(options.points.map((point) => point.year)).range([margin.left, width - margin.right]);
  const svg = d3.select(article).select(".trend-visual").append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("role", "group").attr("aria-label", `${options.title} from ${options.points[0].year} to ${options.points.at(-1).year}`);
  const xAxis = svg.append("g").attr("class", "trend-x-axis").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).tickSizeOuter(0));
  xAxis.selectAll(".tick").attr("data-year", (year) => year).classed("is-selected", (year) => year === selectedYear);
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5).tickFormat((value) => trendValue(value, options.unit)));
  svg.append("g").attr("class", "trend-gridlines").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(width - margin.left - margin.right)).tickFormat(""));

  const line = d3.line().defined((point) => Number.isFinite(point.value)).x((point) => x(point.year)).y((point) => y(point.value));
  groups.forEach((group) => {
    const points = options.points.map((point) => ({ year: point.year, value: point[group.key] }));
    svg.append("path").datum(points).attr("class", "trend-line").attr("d", line).attr("fill", "none").attr("stroke", group.color).attr("stroke-width", group.key === "marist" ? 3 : 2.25).attr("stroke-dasharray", group.dash);
    points.filter((point) => Number.isFinite(point.value)).forEach((point) => {
      const label = `${options.title}, ${point.year}, ${group.label}: ${trendValue(point.value, options.unit)}.`;
      const mark = svg.append("path").attr("class", "trend-point").classed("is-selected", point.year === selectedYear).attr("data-year", point.year).attr("d", d3.symbol().type(group.symbol).size(group.key === "marist" ? 78 : 64)).attr("transform", `translate(${x(point.year)},${y(point.value)})`).attr("fill", group.color).attr("stroke", point.year === selectedYear ? "#202127" : "white").attr("stroke-width", point.year === selectedYear ? 2.5 : 1.5).attr("tabindex", 0).attr("role", "img").attr("aria-current", point.year === selectedYear ? "true" : null).attr("aria-label", label);
      mark.on("pointerenter", function (event) {
        d3.select(this).classed("is-active", true);
        showDataTooltip(label, event.clientX, event.clientY);
      })
        .on("pointermove", (event) => positionDataTooltip(event.clientX, event.clientY))
        .on("pointerleave", function () {
          if (document.activeElement === this) return;
          d3.select(this).classed("is-active", false);
          hideDataTooltip();
        })
        .on("focus", function () {
          d3.select(this).classed("is-active", true);
          showDataTooltipForElement(this, label);
        })
        .on("blur", function () {
          d3.select(this).classed("is-active", false);
          hideDataTooltip();
        });
    });
  });

  const endLabels = groups
    .map((group) => ({ group, value: options.points.at(-1)[group.key] }))
    .map(({ group, value }) => ({ group, y: Number.isFinite(value) ? y(value) : NaN }))
    .filter((label) => Number.isFinite(label.y))
    .sort((left, right) => left.y - right.y);
  if (endLabels.length) {
    endLabels[0].labelY = Math.max(margin.top + 6, endLabels[0].y);
    for (let index = 1; index < endLabels.length; index += 1) endLabels[index].labelY = Math.max(endLabels[index].y, endLabels[index - 1].labelY + 16);
    const overflow = endLabels.at(-1).labelY - (height - margin.bottom - 6);
    if (overflow > 0) endLabels.forEach((label) => { label.labelY -= overflow; });
    endLabels.forEach(({ group, y: lineY, labelY }) => {
      const x = width - margin.right;
      svg.append("line").attr("x1", x + 3).attr("x2", x + 10).attr("y1", lineY).attr("y2", labelY).attr("stroke", group.color);
      svg.append("text").attr("class", "trend-end-label").attr("x", x + 14).attr("y", labelY).attr("fill", group.color).text(group.label);
    });
  }

  const details = document.createElement("details");
  details.className = "detail-disclosure trend-values";
  details.innerHTML = `<summary>View yearly values</summary><div class="table-scroll compact-table"><table><thead><tr><th scope="col">Collection</th><th scope="col">Marist</th><th scope="col">Peer median</th><th scope="col">Aspirant median</th></tr></thead><tbody>${options.points.map((point) => `<tr><th scope="row">${point.year}</th><td>${trendValue(point.marist, options.unit)}</td><td>${trendValue(point.peer, options.unit)}</td><td>${trendValue(point.aspirant, options.unit)}</td></tr>`).join("")}</tbody></table></div>`;
  article.append(details);
}
