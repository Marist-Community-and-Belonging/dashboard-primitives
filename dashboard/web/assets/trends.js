const trendFormatters = {
  percent: new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, style: "percent" }),
  usd: new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, style: "currency", currency: "USD" }),
  index: new Intl.NumberFormat("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
};

async function fetchDatasetHistory(endpoint, releases) {
  return Promise.all(releases
    .slice()
    .sort((left, right) => left.collection_year.localeCompare(right.collection_year))
    .map(async (release) => {
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
  const margin = { top: 30, right: 28, bottom: 52, left: options.unit === "usd" ? 78 : 58 };
  const groups = [
    { key: "marist", label: "Marist", color: "#c91235", dash: null },
    { key: "peer", label: "Peer median", color: "#63666f", dash: "6 4" },
    { key: "aspirant", label: "Aspirant median", color: "#3c8cff", dash: "2 4" },
  ];
  const values = options.points.flatMap((point) => groups.map((group) => point[group.key])).filter(Number.isFinite);
  const extent = d3.extent(values);
  const padding = Math.max((extent[1] - extent[0]) * .16, options.unit === "index" ? .015 : options.unit === "percent" ? 2 : 1000);
  const y = d3.scaleLinear().domain([extent[0] - padding, extent[1] + padding]).nice().range([height - margin.bottom, margin.top]);
  const x = d3.scalePoint().domain(options.points.map((point) => point.year)).range([margin.left, width - margin.right]);
  const svg = d3.select(article).select(".trend-visual").append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("role", "group").attr("aria-label", `${options.title} from ${options.points[0].year} to ${options.points.at(-1).year}`);
  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).tickSizeOuter(0));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5).tickFormat((value) => trendValue(value, options.unit)));
  svg.append("g").attr("class", "trend-gridlines").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(width - margin.left - margin.right)).tickFormat(""));

  const line = d3.line().defined((point) => Number.isFinite(point.value)).x((point) => x(point.year)).y((point) => y(point.value));
  groups.forEach((group) => {
    const points = options.points.map((point) => ({ year: point.year, value: point[group.key] }));
    svg.append("path").datum(points).attr("class", "trend-line").attr("d", line).attr("fill", "none").attr("stroke", group.color).attr("stroke-width", group.key === "marist" ? 3 : 2.25).attr("stroke-dasharray", group.dash);
    points.filter((point) => Number.isFinite(point.value)).forEach((point) => {
      const label = `${options.title}, ${point.year}, ${group.label}: ${trendValue(point.value, options.unit)}.`;
      const mark = svg.append("circle").attr("class", "trend-point").attr("cx", x(point.year)).attr("cy", y(point.value)).attr("r", group.key === "marist" ? 5 : 4).attr("fill", group.color).attr("stroke", "white").attr("stroke-width", 1.5).attr("tabindex", 0).attr("role", "img").attr("aria-label", label);
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

  const details = document.createElement("details");
  details.className = "detail-disclosure trend-values";
  details.innerHTML = `<summary>View yearly values</summary><div class="table-scroll compact-table"><table><thead><tr><th scope="col">Collection</th><th scope="col">Marist</th><th scope="col">Peer median</th><th scope="col">Aspirant median</th></tr></thead><tbody>${options.points.map((point) => `<tr><th scope="row">${point.year}</th><td>${trendValue(point.marist, options.unit)}</td><td>${trendValue(point.peer, options.unit)}</td><td>${trendValue(point.aspirant, options.unit)}</td></tr>`).join("")}</tbody></table></div>`;
  article.append(details);
}
