// Run: node dashboard/campus_calendar_test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const context = vm.createContext({
  Intl, Date, Set, Map, console,
  dataTooltip() {},
  document: { querySelector: () => ({}) },
});
const source = fs.readFileSync(path.join(__dirname, "web/assets/campus-involvement.js"), "utf8");
vm.runInContext(source.slice(0, source.indexOf("\nshowLoadingState();")), context);
const result = vm.runInContext(`(() => {
  const bounds = academicYearBounds(new Date("2024-02-20T12:00:00Z"));
  const counts = dayCountsFromEvents([{
    start: "2024-02-28T12:00:00Z",
    end: "2024-03-01T12:00:00Z",
  }]);
  return {
    bounds,
    counts,
    previousMonth: moveMonth("2024-03", -1),
    nextMonth: moveMonth("2024-02", 1),
    leapDayInTerm: isInTerm("2024-02-29", bounds),
    summerOutOfTerm: isInTerm("2024-07-01", bounds),
  };
})()`, context);

assert.equal(result.bounds.termStart, "2023-08-21");
assert.equal(result.bounds.termEnd, "2024-05-24");
assert.deepEqual(JSON.parse(JSON.stringify(result.counts)), [
  { date: "2024-02-28", count: 1 },
  { date: "2024-02-29", count: 1 },
  { date: "2024-03-01", count: 1 },
]);
assert.equal(result.previousMonth, "2024-02");
assert.equal(result.nextMonth, "2024-03");
assert.equal(result.leapDayInTerm, true);
assert.equal(result.summerOutOfTerm, false);
console.log("Calendar bounds, month navigation, leap day, and multi-day counts pass.");
