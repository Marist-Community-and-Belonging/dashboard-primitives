const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const data = (name, year) => JSON.parse(readFileSync(join(__dirname, "web/data", `${name}-${year}.json`), "utf8"));

function overview() {
  const elements = new Map();
  const charts = [];
  const context = vm.createContext({
    document: { querySelector: (selector) => {
      if (!elements.has(selector)) elements.set(selector, { innerHTML: "", replaceChildren() { charts.length = 0; } });
      return elements.get(selector);
    } },
    dataTooltip() {},
    setupCollectionYearSelector: () => new Promise(() => {}),
    renderTrendChart: (_container, options) => charts.push(options),
  });
  vm.runInContext(readFileSync(join(__dirname, "web/assets/dashboard.js"), "utf8"), context);
  return { context, elements, charts };
}

test("merged profile preserves selected-year values across collections and clears unavailable data", () => {
  const { context, elements } = overview();
  for (const year of [2019, 2020, 2021, 2022, 2023]) {
    context.dataset = data("overview", year);
    context.related = {
      diversity: data("diversity-access", year),
      success: data("success-equity", year),
      affordability: data("affordability-resources", year),
    };
    vm.runInContext("renderMaristValues(dataset, related)", context);
    const html = elements.get("#overview-values-body").innerHTML;
    assert.equal((html.match(/<tr>/g) || []).length, 20);
    const lowest = context.related.affordability.income_bands[0];
    assert.ok(html.includes(`Net price, income ${lowest.display_name}`));
    assert.ok(html.includes(new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(lowest.marist)));
    for (const outcome of context.related.success.outcomes) {
      assert.ok(html.includes(outcome.display_name));
      assert.ok(html.includes(outcome.cohort_year || outcome.data_year));
    }
    const composition = context.related.diversity.groups.find((group) => group.group === "marist");
    for (const category of context.related.diversity.categories) {
      const value = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(composition.normalized_shares[category.category_id] / 100);
      assert.ok(html.includes(`<th scope="row">${category.display_name}</th><td>${value}</td>`));
    }
  }
  context.related = {};
  vm.runInContext("renderMaristValues(dataset, related)", context);
  const html = elements.get("#overview-values-body").innerHTML;
  assert.ok(html.includes("Unavailable"));
  assert.ok(!html.includes("$25,331"));
  assert.ok(!html.includes("undefined"));
});

test("overview keeps all six historical measures and charts enrollment and admissions", () => {
  const { context, elements, charts } = overview();
  context.history = [2019, 2020, 2021, 2022, 2023].map((year) => data("overview", year));
  vm.runInContext("dashboardState.history = history; renderOverviewTrends()", context);
  assert.deepEqual(charts.map((chart) => chart.title), ["Undergraduate enrollment", "Acceptance rate"]);
  assert.equal((elements.get("#overview-history-head").innerHTML.match(/<th /g) || []).length, 7);
  const html = elements.get("#overview-history-body").innerHTML;
  assert.equal((html.match(/<tr>/g) || []).length, 5);
  assert.equal((html.match(/<td>/g) || []).length, 30);
  for (const dataset of context.history) assert.ok(html.includes(dataset.release.collection_year));
});
