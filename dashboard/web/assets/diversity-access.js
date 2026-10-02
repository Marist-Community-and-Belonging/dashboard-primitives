const percentFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, style: "percent" });
const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const indexFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const categoryColors = ["#8e2038", "#3e5968", "#b35d38", "#596b3d", "#705780", "#9a7a28", "#3f7771", "#777982", "#3c8cff"];
const groupStyles = {
  marist: { label: "Marist", color: "#c91235", symbol: d3.symbolCircle },
  peer: { label: "Peer", color: "#63666f", symbol: d3.symbolSquare },
  aspirant: { label: "Aspirant", color: "#3c8cff", symbol: d3.symbolTriangle },
};
dataTooltip();

function formatPercent(value) {
  if (!Number.isFinite(value)) return "Unavailable";
  return percentFormat.format(value / 100);
}

function titleCase(value) {
  return value.replace(/^./, (letter) => letter.toUpperCase());
}

function renderComposition(dataset) {
  const legend = document.querySelector("#composition-legend");
  legend.replaceChildren();
  dataset.categories.forEach((category, index) => {
    const item = document.createElement("button");
    const summary = dataset.groups.map((group) => `${group.display_name} ${formatPercent(group.reported_shares[category.category_id])}`).join("; ");
    item.type = "button";
    item.className = "composition-key";
    item.dataset.highlight = category.category_id;
    item.dataset.tooltip = `${category.display_name}: ${summary}.`;
    item.setAttribute("aria-label", `${item.dataset.tooltip} Highlight matching bars.`);
    item.innerHTML = `<i class="category-key-${index}"></i>${category.display_name}`;
    legend.append(item);
  });

  const chart = document.querySelector("#composition-chart");
  chart.replaceChildren();
  dataset.groups.forEach((group) => {
    const row = document.createElement("div");
    row.className = "composition-row";
    row.innerHTML = `<div class="composition-label"><strong>${group.display_name}</strong><span>${numberFormat.format(group.enrollment)} undergraduates</span></div>`;
    const visual = document.createElement("div");
    visual.className = "composition-visual";
    const svg = d3.select(visual).append("svg").attr("viewBox", "0 0 900 54").attr("role", "group").attr("aria-label", `${group.display_name} undergraduate composition`);
    let x = 0;
    dataset.categories.forEach((category, index) => {
      const width = group.normalized_shares[category.category_id] ?? 0;
      const reported = group.reported_shares[category.category_id];
      if (width <= 0) return;
      const label = `${group.display_name}, ${category.display_name}: ${formatPercent(reported)}.`;
      svg.append("rect")
        .attr("class", "composition-segment")
        .attr("data-highlight", category.category_id)
        .attr("x", x * 9)
        .attr("y", 9)
        .attr("width", Math.max(width * 9, 1))
        .attr("height", 30)
        .attr("fill", categoryColors[index])
        .attr("tabindex", 0)
        .attr("role", "img")
        .attr("aria-label", label)
        .on("pointerenter", function (event) {
          d3.select(this).classed("is-active", true);
          showDataTooltip(label, event.clientX, event.clientY);
        })
        .on("pointermove", function (event) { positionDataTooltip(event.clientX, event.clientY); })
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
      svg.append("text")
        .attr("class", "composition-value")
        .attr("data-highlight", category.category_id)
        .attr("x", (x + width / 2) * 9)
        .attr("y", 29)
        .text(formatPercent(reported));
      x += width;
    });
    row.append(visual);
    chart.append(row);
  });
  linkLegendHighlights(legend, chart);

  const head = document.querySelector("#composition-table-head");
  head.innerHTML = `<tr><th scope="col">Comparison</th>${dataset.categories.map((category) => `<th scope="col">${category.display_name}</th>`).join("")}</tr>`;
  const body = document.querySelector("#composition-table-body");
  body.replaceChildren();
  dataset.groups.forEach((group) => {
    const row = document.createElement("tr");
    row.innerHTML = `<th scope="row">${group.display_name}</th>${dataset.categories.map((category) => `<td>${formatPercent(group.reported_shares[category.category_id])}</td>`).join("")}`;
    body.append(row);
  });
}

function renderAccess(dataset) {
  const grid = document.querySelector("#access-grid");
  grid.replaceChildren();
  const nonresident = dataset.categories.find((category) => category.category_id === "nonresident");
  const accessCards = [
    {
      title: "U.S. nonresident share",
      description: "International/nonresident undergraduates",
      values: dataset.groups.map((group) => ({ label: group.display_name, value: group.reported_shares[nonresident.category_id] })),
    },
    {
      title: "Reported sex distribution",
      description: "Categories available in the selected fall collection",
      values: dataset.groups.map((group) => ({ label: group.display_name, value: group.women_share, secondary: group.men_share })),
      sex: true,
    },
    {
      title: "Pell Grant recipient share",
      description: "Socioeconomic-access indicator",
      values: dataset.groups.map((group) => ({ label: group.display_name, value: group.pell_share })),
    },
  ];

  accessCards.forEach((card) => {
    const article = document.createElement("article");
    article.className = "access-card";
    article.innerHTML = `<h3>${card.title}</h3><p>${card.description}</p><dl>${card.values.map((item) => `<div><dt>${item.label}</dt><dd>${card.sex ? `${formatPercent(item.value)} women · ${formatPercent(item.secondary)} men` : formatPercent(item.value)}</dd></div>`).join("")}</dl>`;
    grid.append(article);
  });
}

function renderScatter(dataset) {
  document.querySelector("#scatterplot").replaceChildren();
  const records = dataset.institutions.filter((record) => Number.isFinite(record.diversity_index) && Number.isFinite(record.graduation_rate) && Number.isFinite(record.enrollment));
  const width = 960;
  const height = 470;
  const margin = { top: 54, right: 30, bottom: 58, left: 68 };
  const x = d3.scaleLinear().domain(d3.extent(records, (record) => record.diversity_index)).nice().range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain(d3.extent(records, (record) => record.graduation_rate)).nice().range([height - margin.bottom, margin.top]);
  const size = d3.scaleSqrt().domain(d3.extent(records, (record) => record.enrollment)).range([55, 420]);
  const svg = d3.select("#scatterplot").append("svg").attr("class", "chart-reveal").attr("viewBox", `0 0 ${width} ${height}`).attr("role", "group").attr("aria-label", "Diversity index and six-year graduation rate scatterplot");

  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(6).tickFormat(d3.format(".2f"))).call((axis) => axis.select(".domain").attr("stroke", "#aeb1b7"));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(6).tickFormat((value) => `${value}%`)).call((axis) => axis.select(".domain").attr("stroke", "#aeb1b7"));
  svg.append("text").attr("x", (margin.left + width - margin.right) / 2).attr("y", height - 12).attr("text-anchor", "middle").attr("class", "axis-label").text("Undergraduate diversity index");
  svg.append("text").attr("transform", "rotate(-90)").attr("x", -(margin.top + height - margin.bottom) / 2).attr("y", 17).attr("text-anchor", "middle").attr("class", "axis-label").text("Six-year graduation rate");

  const legend = svg.append("g").attr("transform", `translate(${margin.left},18)`);
  Object.entries(groupStyles).forEach(([group, style], index) => {
    legend.append("path").attr("d", d3.symbol().type(style.symbol).size(70)()).attr("transform", `translate(${index * 120},0)`).attr("fill", style.color);
    legend.append("text").attr("x", index * 120 + 12).attr("y", 4).attr("class", "scatter-legend-label").text(style.label);
  });

  records.forEach((record) => {
    const style = groupStyles[record.group];
    const label = `${record.institution_name}, ${style.label}: diversity index ${indexFormat.format(record.diversity_index)}, six-year graduation ${formatPercent(record.graduation_rate)}, ${numberFormat.format(record.enrollment)} undergraduates.`;
    svg.append("path")
      .attr("class", "scatter-mark")
      .attr("d", d3.symbol().type(style.symbol).size(size(record.enrollment))())
      .attr("transform", `translate(${x(record.diversity_index)},${y(record.graduation_rate)})`)
      .attr("fill", style.color)
      .attr("fill-opacity", record.group === "marist" ? 1 : 0.72)
      .attr("stroke", record.group === "marist" ? "#202127" : "white")
      .attr("stroke-width", record.group === "marist" ? 2.5 : 1.5)
      .attr("tabindex", 0)
      .attr("role", "img")
      .attr("aria-label", label)
      .on("pointerenter", function (event) { d3.select(this).classed("is-active", true); showDataTooltip(label, event.clientX, event.clientY); })
      .on("pointermove", function (event) { positionDataTooltip(event.clientX, event.clientY); })
      .on("pointerleave", function () {
        if (document.activeElement === this) return;
        d3.select(this).classed("is-active", false);
        hideDataTooltip();
      })
      .on("focus", function () { d3.select(this).classed("is-active", true); showDataTooltipForElement(this, label); })
      .on("blur", function () { d3.select(this).classed("is-active", false); hideDataTooltip(); });
  });

  const body = document.querySelector("#scatter-table-body");
  body.replaceChildren();
  records.forEach((record) => {
    const row = document.createElement("tr");
    row.innerHTML = `<th scope="row">${record.institution_name}</th><td>${groupStyles[record.group].label}</td><td>${indexFormat.format(record.diversity_index)}</td><td>${formatPercent(record.graduation_rate)}</td><td>${numberFormat.format(record.enrollment)}</td>`;
    body.append(row);
  });
}

function renderPage(dataset) {
  document.querySelector("#collection-year").textContent = dataset.release.collection_year;
  document.querySelector("#institution-count").textContent = dataset.institution_count;
  document.querySelector("#release-type").textContent = titleCase(dataset.release.release_type);
  document.querySelector("#active-release").textContent = titleCase(dataset.release.release_type);
  document.querySelector("#data-status").innerHTML = `<strong>Verified dataset.</strong> ${dataset.data_year} enrollment and final student-aid and graduation measures from ${dataset.release.source}; retrieved ${dataset.release.retrieved_at}.`;
  document.querySelector("#composition-note").textContent = dataset.methodology.composition;
  document.querySelector("#composition-method").textContent = dataset.methodology.composition;
  document.querySelector("#diversity-method").textContent = dataset.methodology.diversity_index;
  const marist = dataset.institutions.find((institution) => institution.group === "marist");
  document.querySelector("#diversity-callout").innerHTML = `<strong>Diversity index:</strong> Marist is ${indexFormat.format(marist.diversity_index)}.`;
  const query = new URLSearchParams({ year: dataset.release.collection_year });
  document.querySelector(".download-link").href = `/api/v1/diversity-access/export.csv?${query}`;
  renderComposition(dataset);
  renderAccess(dataset);
  renderScatter(dataset);
  prepareScrollReveals(document.querySelector("main"));
}

function renderDiversityTrend(history) {
  const points = history.map((dataset) => {
    const marist = dataset.institutions.find((institution) => institution.group === "marist");
    return {
      year: dataset.release.collection_year,
      marist: marist.diversity_index,
      peer: d3.median(dataset.institutions.filter((institution) => institution.group === "peer"), (institution) => institution.diversity_index),
      aspirant: d3.median(dataset.institutions.filter((institution) => institution.group === "aspirant"), (institution) => institution.diversity_index),
    };
  });
  renderTrendChart(document.querySelector("#diversity-trend"), {
    title: "Undergraduate diversity index",
    description: "Probability that two randomly selected undergraduates are reported in different race or ethnicity categories.",
    unit: "index",
    points,
  });
  prepareScrollReveals(document.querySelector("#diversity-trend"));
}

async function loadDiversityYear(year) {
  const status = document.querySelector("#data-status");
  status.setAttribute("role", "status");
  try {
    status.textContent = `Loading ${year} diversity and access data…`;
    const response = await fetch(`/api/v1/diversity-access?${new URLSearchParams({ year })}`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    renderPage(await response.json());
  } catch (error) {
    status.textContent = "The diversity and access dataset is temporarily unavailable. Please try again later.";
    status.setAttribute("role", "alert");
    console.error(error);
    throw error;
  }
}

async function loadPage() {
  try {
    const catalog = await setupCollectionYearSelector(loadDiversityYear);
    await loadDiversityYear(catalog.selectedYear);
    renderDiversityTrend(await fetchDatasetHistory("/api/v1/diversity-access", catalog.releases));
  } catch (error) {
    console.error(error);
  } finally {
    window.dashboardLoading?.finish();
  }
}

loadPage();
