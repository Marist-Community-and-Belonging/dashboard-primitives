const percentFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, style: "percent" });
const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const indexFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const pointFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

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

function formatPoints(value) {
  if (!Number.isFinite(value)) return "Unavailable";
  if (value === 0) return "0 pts";
  return `${value > 0 ? "+" : "−"}${pointFormat.format(Math.abs(value))} pts`;
}

function titleCase(value) {
  return value.replace(/^./, (letter) => letter.toUpperCase());
}

function renderComposition(dataset) {
  const legend = document.querySelector("#composition-legend");
  legend.replaceChildren();
  dataset.categories.forEach((category, index) => {
    const item = document.createElement("span");
    item.innerHTML = `<i style="--category-color:${categoryColors[index]}"></i>${category.display_name}`;
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
      x += width;
    });
    row.append(visual);
    chart.append(row);
  });

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

function renderGaps(dataset) {
  const heatmap = document.querySelector("#gap-heatmap");
  heatmap.replaceChildren();
  const maxGap = d3.max(dataset.gaps.flatMap((gap) => [Math.abs(gap.peer_gap ?? 0), Math.abs(gap.aspirant_gap ?? 0)])) || 1;
  const color = d3.scaleLinear().domain([-maxGap, 0, maxGap]).range(["#356da8", "#f3f4f5", "#a71934"]);
  const header = document.createElement("div");
  header.className = "gap-row gap-header";
  header.innerHTML = "<span>Population</span><span>vs. peer median</span><span>vs. aspirant median</span>";
  heatmap.append(header);
  dataset.gaps.forEach((gap) => {
    const row = document.createElement("div");
    row.className = "gap-row";
    const label = document.createElement("strong");
    label.textContent = gap.display_name;
    row.append(label);
    [["peer", gap.peer_gap], ["aspirant", gap.aspirant_gap]].forEach(([comparison, value]) => {
      const cell = document.createElement("span");
      cell.className = "gap-cell";
      cell.style.background = Number.isFinite(value) ? color(value) : "#f3f4f5";
      cell.textContent = formatPoints(value);
      cell.tabIndex = 0;
      cell.setAttribute("aria-label", `${gap.display_name}: Marist is ${formatPoints(value)} versus the ${comparison} median.`);
      row.append(cell);
    });
    heatmap.append(row);
  });

  const body = document.querySelector("#gap-table-body");
  body.replaceChildren();
  dataset.gaps.forEach((gap) => {
    const row = document.createElement("tr");
    row.innerHTML = `<th scope="row">${gap.display_name}</th><td>${formatPercent(gap.marist)}</td><td>${formatPercent(gap.peer_median)}</td><td>${formatPoints(gap.peer_gap)}</td><td>${formatPercent(gap.aspirant_median)}</td><td>${formatPoints(gap.aspirant_gap)}</td>`;
    body.append(row);
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
  const peerMedian = d3.median(dataset.institutions.filter((institution) => institution.group === "peer"), (institution) => institution.diversity_index);
  document.querySelector("#diversity-callout").innerHTML = `<strong>Diversity index:</strong> Marist is ${indexFormat.format(marist.diversity_index)}, above the peer median of ${indexFormat.format(peerMedian)}.`;
  const query = new URLSearchParams({ year: dataset.release.collection_year });
  document.querySelector(".download-link").href = `/api/v1/diversity-access/export.csv?${query}`;
  renderComposition(dataset);
  renderAccess(dataset);
  renderGaps(dataset);
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
  }
}

loadPage();
