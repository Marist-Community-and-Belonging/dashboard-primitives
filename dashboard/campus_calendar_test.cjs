// Run: node dashboard/campus_calendar_test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function element() {
  return {
    children: [], dataset: {}, style: {}, attributes: {},
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(key, callback) { this[key] = callback; },
    focus() {},
  };
}
const root = element();
const range = element();
const context = vm.createContext({
  Intl, Date, Set, Map, console,
  dataTooltip() {},
  document: {
    createElement: element,
    querySelector(selector) {
      if (selector === "#events-calendar") return root;
      if (selector === "#calendar-range") return range;
      return root.children[0].children.find((item) => item.id === selector.slice(1));
    },
  },
});
const source = fs.readFileSync(path.join(__dirname, "web/assets/campus-involvement.js"), "utf8");
vm.runInContext(source.slice(0, source.indexOf("\nloadCampusEvents();")), context);
vm.runInContext(`
  const bounds = academicYearBounds(new Date("2024-02-20T12:00:00Z"));
  selectedDate = "2024-02-20";
  const events = [{start: "2024-02-28T12:00:00Z", end: "2024-03-01T12:00:00Z"}];
  renderCalendar(events, dayCountsFromEvents(events), bounds);
`, context);
assert.equal(root.children[0].children[1].children.length, 10);
assert.equal(root.children[0].children[1].value, "2024-02");
const grid = root.children[1];
assert.equal((grid.children.length - 7) % 7, 0);
const leapDay = grid.children.find((item) => item.dataset.date === "2024-02-29");
assert.equal(leapDay.children[1].textContent, "1 event");
assert.equal(leapDay.className, "calendar-day density-low");
assert.equal(root.children[0].children[3].textContent, "1 event this month");
vm.runInContext("renderCalendar([], [{date: '2024-02-20', count: 8}], bounds)", context);
assert.equal(root.children[1].children.find((item) => item.dataset.date === "2024-02-20").className, "calendar-day density-high");
vm.runInContext("renderDayList = (date) => { selectedDate = date; };", context);
root.children[0].children[2].click();
assert.equal(root.children[0].children[1].value, "2024-03");
assert.equal(root.children[1].className, "calendar-grid is-entering");
assert.equal(vm.runInContext("selectedDate", context), "2024-03-01");
vm.runInContext("renderCalendar([], [], bounds)", context);
assert.equal(root.children[0].children[3].textContent, "0 events this month");
assert.equal(root.children[1].children.find((item) => item.dataset.date === "2024-03-01").children[1].textContent, "0 events");
root.children[0].children[1].value = "2023-08";
root.children[0].children[1].change();
assert.equal(root.children[0].children[0].disabled, true);
assert.equal(root.children[1].children.find((item) => item.dataset.date === "2023-08-01").disabled, true);
root.children[0].children[1].value = "2024-05";
root.children[0].children[1].change();
assert.equal(root.children[0].children[2].disabled, true);
console.log("Calendar navigation, density, leap day, multi-day counts, and empty filters pass.");
