const profileFormatters = {
  percent: new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, style: "percent" }),
  students: new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }),
  usd: new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, style: "currency", currency: "USD" }),
};

const profileCategoryColors = {
  white: "#777982",
  black: "#8e2038",
  hispanic: "#b35d38",
  asian: "#3e5968",
  pacific_islander: "#705780",
  american_indian: "#9a7a28",
  multiracial: "#3f7771",
  unknown: "#596b3d",
  nonresident: "#3c8cff",
};

const profileState = { request: 0, history: [], selectedYear: null };
dataTooltip();

function profileValue(value, unit) {
  if (!Number.isFinite(value)) return "Unavailable";
  return unit === "percent" ? profileFormatters.percent.format(value / 100) : profileFormatters[unit].format(value);
}

function profileMetric(metrics, id) {
  return metrics.find((metric) => metric.metric_id === id);
}

function profileKPI(metric, definition = "") {
  const item = document.createElement("div");
  item.className = "profile-kpi";
  item.innerHTML = `<p class="profile-kpi-value">${profileValue(metric.value, metric.unit)}</p><p class="profile-kpi-label">${metric.display_name}</p>${definition ? `<p class="profile-kpi-definition">${definition}</p>` : ""}`;
  return item;
}

function profileRow(area, name, value, period) {
  const row = document.createElement("tr");
  row.innerHTML = `<td>${area}</td><td>${name}</td><td>${value}</td><td>${period || "Unavailable"}</td>`;
  return row;
}

function profileInteractive(selection, label) {
  selection
    .attr("tabindex", 0)
    .attr("role", "img")
    .attr("aria-label", label)
    .on("pointerenter", function (event) {
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
}

function renderProfileComposition(diversity) {
  const group = diversity.groups.find((record) => record.group === "marist");
  const categories = diversity.categories
    .map((category) => ({ ...category, value: group.normalized_shares[category.category_id] }))
    .filter((category) => Number.isFinite(category.value) && category.value > 0);
  const chart = document.querySelector("#profile-composition-chart");
  const legend = document.querySelector("#profile-composition-legend");
  chart.replaceChildren();
  legend.replaceChildren();

  let offset = 0;
  const svg = d3.select(chart).append("svg").attr("viewBox", "0 0 700 52").attr("role", "group").attr("aria-label", "Marist undergraduate race and ethnicity composition");
  categories.forEach((category) => {
    const label = `${category.display_name}: ${profileValue(category.value, "percent")}.`;
    const segment = svg.append("rect")
      .attr("class", "composition-segment")
      .attr("data-highlight", category.category_id)
      .attr("x", offset * 7)
      .attr("y", 8)
      .attr("width", Math.max(category.value * 7, 1))
      .attr("height", 34)
      .attr("fill", profileCategoryColors[category.category_id]);
    profileInteractive(segment, label);
    svg.append("text")
      .attr("class", "composition-value")
      .attr("data-highlight", category.category_id)
      .attr("x", (offset + category.value / 2) * 7)
      .attr("y", 30)
      .text(profileValue(category.value, "percent"));
    offset += category.value;

    const key = document.createElement("button");
    key.type = "button";
    key.className = "composition-key";
    key.dataset.highlight = category.category_id;
    key.dataset.tooltip = label;
    key.setAttribute("aria-label", `${label} Highlight matching bar.`);
    key.innerHTML = `<i class="category-${category.category_id}"></i>${category.display_name} ${profileValue(category.value, "percent")}`;
    legend.append(key);
  });
  linkLegendHighlights(legend, chart);

  const sexValues = document.querySelector("#profile-sex-values");
  sexValues.innerHTML = `<div><span>Women</span><strong>${profileValue(group.women_share, "percent")}</strong></div><div><span>Men</span><strong>${profileValue(group.men_share, "percent")}</strong></div>`;
}

function renderSelectedProfile(datasets) {
  const { overview, diversity, success, affordability } = datasets;
  const year = overview.release.collection_year;
  profileState.selectedYear = year;
  document.querySelector("#collection-year").textContent = year;
  document.querySelector("#release-type").textContent = overview.release.release_type.replace(/^./, (letter) => letter.toUpperCase());
  document.querySelector("#active-release").textContent = overview.release.release_type;
  document.querySelector("#data-status").innerHTML = `<strong>Verified final IPEDS data.</strong> Retrieved ${overview.release.retrieved_at}.`;

  const enrollment = profileMetric(overview.metrics, "undergraduate_enrollment");
  const acceptance = profileMetric(overview.metrics, "acceptance_rate");
  const enrollmentValues = document.querySelector("#profile-enrollment-values");
  enrollmentValues.replaceChildren(
    profileKPI(enrollment, "Fall undergraduate headcount"),
    profileKPI(acceptance, "Applicants offered admission"),
  );
  document.querySelector("#profile-enrollment-year").textContent = enrollment.data_year;

  renderProfileComposition(diversity);
  document.querySelector("#profile-composition-year").textContent = enrollment.data_year;

  const outcomeValues = document.querySelector("#profile-outcome-values");
  outcomeValues.replaceChildren(...success.outcomes.map((outcome) => profileKPI({ ...outcome, unit: "percent" })));
  document.querySelector("#profile-outcomes-year").textContent = success.outcomes.find((outcome) => outcome.cohort_year)?.cohort_year || success.outcomes[0].data_year;

  const lowestIncome = affordability.income_bands[0];
  const affordabilityMetrics = [
    ...affordability.headlines,
    {
      display_name: `Net price, income ${lowestIncome.display_name}`,
      value: lowestIncome.marist,
      unit: "usd",
    },
  ];
  const affordabilityValues = document.querySelector("#profile-affordability-values");
  affordabilityValues.replaceChildren(...affordabilityMetrics.map((metric) => profileKPI(metric)));
  document.querySelector("#profile-affordability-year").textContent = affordability.headlines[0].data_year;

  const body = document.querySelector("#profile-values-body");
  body.replaceChildren();
  [enrollment, acceptance].forEach((metric) => body.append(profileRow("Enrollment and admissions", metric.display_name, profileValue(metric.value, metric.unit), metric.data_year)));
  const maristGroup = diversity.groups.find((group) => group.group === "marist");
  body.append(profileRow("Student composition", "Women", profileValue(maristGroup.women_share, "percent"), enrollment.data_year));
  body.append(profileRow("Student composition", "Men", profileValue(maristGroup.men_share, "percent"), enrollment.data_year));
  diversity.categories.forEach((category) => body.append(profileRow("Race and ethnicity", category.display_name, profileValue(maristGroup.normalized_shares[category.category_id], "percent"), enrollment.data_year)));
  success.outcomes.forEach((outcome) => body.append(profileRow("Student outcomes", outcome.display_name, profileValue(outcome.value, "percent"), outcome.cohort_year || outcome.data_year)));
  affordability.headlines.forEach((metric) => body.append(profileRow("Affordability and access", metric.display_name, profileValue(metric.value, metric.unit), metric.data_year)));
  body.append(profileRow("Affordability and access", `Net price, income ${lowestIncome.display_name}`, profileValue(lowestIncome.marist, "usd"), affordability.headlines[0].data_year));

  document.querySelector(".download-link").href = `/api/v1/export.csv?${new URLSearchParams({ year })}`;
  prepareScrollReveals(document.querySelector(".profile-snapshot"));
}

function renderProfileTrend(container, metricID, history) {
  const points = history.map((dataset) => {
    const metric = profileMetric(dataset.metrics, metricID);
    return { year: dataset.release.collection_year, value: metric?.value, metric };
  });
  const firstMetric = points.find((point) => point.metric)?.metric;
  if (!firstMetric) return;

  const article = document.createElement("article");
  article.className = "profile-trend-card";
  article.innerHTML = `<header><h3>${firstMetric.display_name}</h3><p>${firstMetric.interpretation}</p></header><div class="profile-mini-chart"></div><p class="profile-trend-latest"></p>`;
  container.append(article);

  const width = 440;
  const height = 190;
  const margin = { top: 18, right: 34, bottom: 38, left: firstMetric.unit === "usd" ? 70 : 52 };
  const values = points.map((point) => point.value).filter(Number.isFinite);
  const extent = d3.extent(values);
  const fallbackPadding = firstMetric.unit === "percent" ? 2 : firstMetric.unit === "usd" ? 1000 : 100;
  const padding = Math.max((extent[1] - extent[0]) * .18, fallbackPadding);
  const y = d3.scaleLinear().domain([extent[0] - padding, extent[1] + padding]).nice().range([height - margin.bottom, margin.top]);
  const x = d3.scalePoint().domain(points.map((point) => point.year)).range([margin.left, width - margin.right]);
  const visual = article.querySelector(".profile-mini-chart");
  const svg = d3.select(visual).append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("role", "group").attr("aria-label", `${firstMetric.display_name} across available final collection years`);
  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).tickSizeOuter(0));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(4).tickFormat((value) => profileValue(value, firstMetric.unit)));
  svg.append("g").attr("class", "trend-gridlines").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(width - margin.left - margin.right)).tickFormat(""));
  const line = d3.line().defined((point) => Number.isFinite(point.value)).x((point) => x(point.year)).y((point) => y(point.value));
  svg.append("path").datum(points).attr("class", "trend-line").attr("d", line).attr("fill", "none").attr("stroke", "#c91235").attr("stroke-width", 3);
  points.filter((point) => Number.isFinite(point.value)).forEach((point) => {
    const selected = point.year === profileState.selectedYear;
    const label = `${firstMetric.display_name}, ${point.year}: ${profileValue(point.value, firstMetric.unit)}.`;
    const mark = svg.append("circle")
      .attr("class", `trend-point${selected ? " is-selected" : ""}`)
      .attr("cx", x(point.year))
      .attr("cy", y(point.value))
      .attr("r", selected ? 6 : 4.5)
      .attr("fill", "#c91235")
      .attr("stroke", selected ? "#202127" : "white")
      .attr("stroke-width", selected ? 2.5 : 1.5);
    profileInteractive(mark, label);
  });
  const selectedPoint = points.find((point) => point.year === profileState.selectedYear);
  article.querySelector(".profile-trend-latest").textContent = selectedPoint
    ? `${selectedPoint.year}: ${profileValue(selectedPoint.value, firstMetric.unit)}`
    : "Selected year unavailable";
}

function renderProfileHistory(history) {
  profileState.history = history;
  const container = document.querySelector("#profile-trends");
  container.replaceChildren();
  const metricIDs = ["undergraduate_enrollment", "acceptance_rate", "retention_rate", "six_year_graduation_rate", "average_net_price", "pell_share"];
  metricIDs.forEach((id) => renderProfileTrend(container, id, history));

  const metrics = metricIDs.map((id) => profileMetric(history.at(-1).metrics, id));
  document.querySelector("#profile-history-head").innerHTML = `<tr><th scope="col">Collection</th>${metrics.map((metric) => `<th scope="col">${metric.display_name}</th>`).join("")}</tr>`;
  document.querySelector("#profile-history-body").innerHTML = history.map((dataset) => `<tr><th scope="row">${dataset.release.collection_year}</th>${metricIDs.map((id) => {
    const metric = profileMetric(dataset.metrics, id);
    return `<td>${profileValue(metric.value, metric.unit)}</td>`;
  }).join("")}</tr>`).join("");
  prepareScrollReveals(container);
}

async function fetchProfileDataset(endpoint, year) {
  const response = await fetch(`${endpoint}?${new URLSearchParams({ year })}`, { cache: "no-cache", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${endpoint} request failed with ${response.status}`);
  return response.json();
}

async function loadProfileYear(year) {
  const request = ++profileState.request;
  const status = document.querySelector("#data-status");
  status.textContent = `Loading ${year} Marist profile…`;
  try {
    const [overview, diversity, success, affordability] = await Promise.all([
      fetchProfileDataset("/api/v1/overview", year),
      fetchProfileDataset("/api/v1/diversity-access", year),
      fetchProfileDataset("/api/v1/success-equity", year),
      fetchProfileDataset("/api/v1/affordability-resources", year),
    ]);
    if (request !== profileState.request) return;
    renderSelectedProfile({ overview, diversity, success, affordability });
    if (profileState.history.length) renderProfileHistory(profileState.history);
  } catch (error) {
    if (request !== profileState.request) return;
    status.textContent = "The Marist profile is temporarily unavailable. Please try again later.";
    status.setAttribute("role", "alert");
    console.error(error);
    throw error;
  }
}

async function loadMaristProfile() {
  const status = document.querySelector("#data-status");
  try {
    const catalog = await setupCollectionYearSelector(loadProfileYear);
    await loadProfileYear(catalog.selectedYear);
    const history = await Promise.all(catalog.releases
      .slice()
      .sort((left, right) => left.collection_year.localeCompare(right.collection_year))
      .map((release) => fetchProfileDataset("/api/v1/overview", release.collection_year)));
    renderProfileHistory(history);
  } catch (error) {
    status.textContent = "The Marist profile is temporarily unavailable. Please try again later.";
    status.setAttribute("role", "alert");
    console.error(error);
  }
}

loadMaristProfile();
