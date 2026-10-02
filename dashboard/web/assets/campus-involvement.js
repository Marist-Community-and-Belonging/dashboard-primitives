dataTooltip();

const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const shortTime = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const monthHeading = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const eventDateLabel = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const easternYmd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });

let selectedDate = null;
let visibleMonth = null;
let payloadCache = null;
let selectedTypes = new Set();
let onCampusOnly = false;
const uncategorizedFilter = "__uncategorized__";
const dayEmpty = document.querySelector("#day-empty");

function skeleton(className = "") {
  const node = document.createElement("span");
  node.className = `skeleton ${className}`;
  node.setAttribute("aria-hidden", "true");
  return node;
}

function showLoadingState() {
  document.querySelectorAll(".release-summary dd").forEach((value) => {
    value.textContent = "";
    value.classList.add("skeleton", "loading-value");
  });

  const filters = document.createElement("div");
  filters.className = "loading-filter-row";
  filters.append(...Array.from({ length: 7 }, () => skeleton("loading-filter")));
  document.querySelector("#event-filters").replaceChildren(filters);

  const toolbar = document.createElement("div");
  toolbar.className = "loading-month-toolbar";
  toolbar.append(skeleton("loading-month-title"), skeleton("loading-month-total"));
  const grid = document.createElement("div");
  grid.className = "loading-calendar-grid";
  grid.append(...Array.from({ length: 35 }, () => skeleton()));
  document.querySelector("#month-calendar").replaceChildren(toolbar, grid);

  document.querySelector("#selected-day-label").textContent = "Loading events…";
  document.querySelector("#day-event-list").replaceChildren(...Array.from({ length: 4 }, () => {
    const event = document.createElement("div");
    event.className = "loading-event";
    event.append(skeleton(), skeleton());
    return event;
  }));
  document.querySelectorAll("#event-filters, #month-calendar, #day-event-list").forEach((root) => root.setAttribute("aria-busy", "true"));
}

function finishLoadingState() {
  document.querySelectorAll(".release-summary dd").forEach((value) => value.classList.remove("skeleton", "loading-value"));
  document.querySelectorAll("#event-filters, #month-calendar, #day-event-list").forEach((root) => root.removeAttribute("aria-busy"));
  window.dashboardLoading?.finish();
}

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function eventYmd(iso) {
  return easternYmd.format(new Date(iso));
}

function parseYmd(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function startOfUtcWeek(date) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() - copy.getUTCDay());
  return copy;
}

function mondayOnOrBefore(date) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() - ((copy.getUTCDay() + 6) % 7));
  return copy;
}

function fridayOnOrAfter(date) {
  const copy = new Date(date);
  const day = copy.getUTCDay();
  if (day !== 5) copy.setUTCDate(copy.getUTCDate() + ((5 - day + 7) % 7));
  return copy;
}

/** Academic year: Mon on/before Aug 24 through Fri on/after May 21. Summer uses next fall. */
function academicYearBounds(ref = new Date()) {
  const [year, month, day] = easternYmd.format(ref).split("-").map(Number);
  const today = Date.UTC(year, month - 1, day);
  const startYear = today < Date.UTC(year, 4, 21) ? year - 1 : year;
  const termStart = mondayOnOrBefore(new Date(Date.UTC(startYear, 7, 24)));
  const termEnd = fridayOnOrAfter(new Date(Date.UTC(startYear + 1, 4, 21)));
  const gridStart = startOfUtcWeek(termStart);
  const gridEnd = startOfUtcWeek(termEnd);
  gridEnd.setUTCDate(gridEnd.getUTCDate() + 6);
  return {
    startYear,
    termStart: ymd(termStart),
    termEnd: ymd(termEnd),
    gridStart,
    gridEnd,
  };
}

function isInTerm(date, bounds) {
  return date >= bounds.termStart && date <= bounds.termEnd;
}

function eventTimeLabel(event) {
  if (event.all_day) return "All day";
  return `${shortTime.format(new Date(event.start))}–${shortTime.format(new Date(event.end))}`;
}

function topEventTypes(events) {
  return d3.rollups(events, (rows) => rows.length, (event) => event.event_type || "Other")
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8);
}

function filteredEvents() {
  if (!payloadCache) return [];
  const categorizedTypes = new Set(topEventTypes(payloadCache.events).map(([type]) => type));
  return payloadCache.events.filter((event) => {
    const type = event.event_type || "Other";
    if (selectedTypes.size
      && !selectedTypes.has(type)
      && !(selectedTypes.has(uncategorizedFilter) && !categorizedTypes.has(type))) return false;
    if (onCampusOnly && event.location_type !== "On-Campus") return false;
    return true;
  });
}

function dayCountsFromEvents(events) {
  const counts = new Map();
  events.forEach((event) => {
    const start = parseYmd(eventYmd(event.start));
    const end = parseYmd(eventYmd(event.end));
    for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const date = ymd(cursor);
      counts.set(date, (counts.get(date) || 0) + 1);
    }
  });
  return [...counts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function eventsForDate(date, events = filteredEvents()) {
  return events.filter((event) => eventYmd(event.start) <= date && date <= eventYmd(event.end));
}

function defaultSelectedDate(days, bounds) {
  const today = easternYmd.format(new Date());
  if (isInTerm(today, bounds)) return today;
  const inTerm = days.filter((day) => isInTerm(day.date, bounds));
  const upcoming = inTerm.find((day) => day.date >= today);
  return upcoming?.date || inTerm[inTerm.length - 1]?.date || bounds.termStart;
}

function thisWeekCount(events) {
  const today = parseYmd(easternYmd.format(new Date()));
  const weekStart = startOfUtcWeek(today);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const start = ymd(weekStart);
  const end = ymd(weekEnd);
  return events.filter((event) => eventYmd(event.start) <= end && eventYmd(event.end) >= start).length;
}

function updateSummary(events, days) {
  document.querySelector("#event-count").textContent = String(events.length);
  document.querySelector("#active-day-count").textContent = String(days.length);
  document.querySelector("#week-count").textContent = String(thisWeekCount(events));
}

function eventItem(event, includeDate = false) {
  const item = document.createElement("article");
  item.className = "event-item";
  const meta = [event.group, event.event_type, event.location].filter(Boolean).join(" · ");
  const time = document.createElement("p");
  const body = document.createElement("div");
  const title = document.createElement(includeDate ? "h3" : "h4");
  const details = document.createElement("p");
  time.className = "event-time";
  time.textContent = includeDate
    ? `${eventDateLabel.format(parseYmd(eventYmd(event.start)))} · ${eventTimeLabel(event)}`
    : eventTimeLabel(event);
  body.className = "event-body";
  title.className = "event-title";
  details.className = "event-meta";
  details.textContent = meta || "—";
  try {
    const url = new URL(event.link);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported event link");
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = event.title;
    title.append(link);
  } catch {
    title.textContent = event.title;
  }
  body.append(title, details);
  item.append(time, body);
  return item;
}

function renderDayList(date) {
  selectedDate = date;
  document.querySelector("#selected-day-label").textContent = dayLabel.format(parseYmd(date));
  const list = document.querySelector("#day-event-list");
  const events = eventsForDate(date);
  dayEmpty.hidden = events.length > 0;
  list.replaceChildren(...(events.length ? events.map((event) => eventItem(event)) : [dayEmpty]));
  d3.selectAll(".month-day").classed("is-selected", function () { return this.dataset.date === date; });
}

function addCellHover(selection, label) {
  selection
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", label)
    .on("pointerenter", function (event) {
      d3.select(this).classed("is-active", true);
      showDataTooltip(label, event.clientX, event.clientY);
    })
    .on("pointermove", (event) => positionDataTooltip(event.clientX, event.clientY))
    .on("pointerleave", function () {
      if (document.activeElement !== this) {
        d3.select(this).classed("is-active", false);
        hideDataTooltip();
      }
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

function renderFilters(events) {
  const root = document.querySelector("#event-filters");
  const visibleTypes = topEventTypes(events);
  const categorizedTypes = new Set(visibleTypes.map(([type]) => type));
  visibleTypes.push([uncategorizedFilter, events.filter((event) => !categorizedTypes.has(event.event_type || "Other")).length]);

  root.replaceChildren();
  const typeWrap = document.createElement("div");
  typeWrap.className = "filter-row";
  typeWrap.setAttribute("role", "group");
  typeWrap.setAttribute("aria-label", "Event type filters");

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = `filter-chip${selectedTypes.size ? "" : " is-active"}`;
  allButton.setAttribute("aria-pressed", String(selectedTypes.size === 0));
  allButton.textContent = `All types (${events.length})`;
  allButton.addEventListener("click", () => {
    selectedTypes = new Set();
    refreshView();
  });
  typeWrap.append(allButton);

  visibleTypes.forEach(([type, count]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-chip${selectedTypes.has(type) ? " is-active" : ""}`;
    button.setAttribute("aria-pressed", String(selectedTypes.has(type)));
    button.textContent = `${type === uncategorizedFilter ? "Uncategorized" : type} (${count})`;
    button.addEventListener("click", () => {
      if (selectedTypes.has(type)) selectedTypes.delete(type);
      else selectedTypes.add(type);
      refreshView();
    });
    typeWrap.append(button);
  });
  root.append(typeWrap);

  const placeWrap = document.createElement("div");
  placeWrap.className = "filter-row";
  placeWrap.setAttribute("role", "group");
  placeWrap.setAttribute("aria-label", "Location filters");
  const campus = document.createElement("button");
  campus.type = "button";
  campus.className = `filter-chip${onCampusOnly ? " is-active" : ""}`;
  campus.setAttribute("aria-pressed", String(onCampusOnly));
  campus.textContent = "On-campus only";
  campus.addEventListener("click", () => {
    onCampusOnly = !onCampusOnly;
    refreshView();
  });
  placeWrap.append(campus);
  root.append(placeWrap);
}

function monthKey(date) {
  return ymd(date).slice(0, 7);
}

function moveMonth(key, amount) {
  const date = parseYmd(`${key}-01`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return monthKey(date);
}

function renderMonthCalendar(days, bounds, events) {
  const root = document.querySelector("#month-calendar");
  root.replaceChildren();
  const counts = new Map(days.map((day) => [day.date, day.count]));
  const firstMonth = bounds.termStart.slice(0, 7);
  const lastMonth = bounds.termEnd.slice(0, 7);
  visibleMonth ||= selectedDate.slice(0, 7);
  visibleMonth = visibleMonth < firstMonth ? firstMonth : visibleMonth > lastMonth ? lastMonth : visibleMonth;

  const monthStart = parseYmd(`${visibleMonth}-01`);
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
  const gridStart = startOfUtcWeek(monthStart);
  const gridEnd = startOfUtcWeek(monthEnd);
  gridEnd.setUTCDate(gridEnd.getUTCDate() + 6);
  const monthCounts = days.filter((day) => day.date.startsWith(visibleMonth)).map((day) => day.count);
  const maxCount = Math.max(...monthCounts, 1);
  const monthTotal = events.filter((event) => eventYmd(event.start) <= ymd(monthEnd) && eventYmd(event.end) >= `${visibleMonth}-01`).length;

  const toolbar = document.createElement("div");
  toolbar.className = "month-toolbar";
  const controls = document.createElement("div");
  controls.className = "month-controls";
  const previous = document.createElement("button");
  const next = document.createElement("button");
  const heading = document.createElement("h3");
  const summary = document.createElement("div");
  const total = document.createElement("div");
  const densityKey = document.createElement("div");
  previous.type = next.type = "button";
  previous.textContent = "← Previous";
  next.textContent = "Next →";
  previous.setAttribute("aria-label", "Previous month");
  next.setAttribute("aria-label", "Next month");
  previous.disabled = visibleMonth === firstMonth;
  next.disabled = visibleMonth === lastMonth;
  heading.textContent = monthHeading.format(monthStart);
  summary.className = "month-summary";
  total.className = "month-total";
  total.innerHTML = `<strong>${monthTotal}</strong>${monthTotal === 1 ? "event" : "events"} this month`;
  densityKey.className = "event-density-key";
  densityKey.setAttribute("aria-label", "Event density: lighter red means fewer events; darker red means more events");
  densityKey.innerHTML = "<span>Fewer</span><i aria-hidden=\"true\"></i><span>More</span>";
  const changeMonth = (amount) => {
    visibleMonth = moveMonth(visibleMonth, amount);
    selectedDate = days.find((day) => day.date.startsWith(visibleMonth))?.date
      || [bounds.termStart, `${visibleMonth}-01`].sort().at(-1);
    renderMonthCalendar(days, bounds, events);
    renderDayList(selectedDate);
  };
  previous.addEventListener("click", () => changeMonth(-1));
  next.addEventListener("click", () => changeMonth(1));
  controls.append(previous, heading, next);
  summary.append(total, densityKey);
  toolbar.append(controls, summary);

  const weekdays = document.createElement("div");
  weekdays.className = "month-weekdays";
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((label) => {
    const day = document.createElement("span");
    day.textContent = label;
    weekdays.append(day);
  });

  const grid = document.createElement("div");
  grid.className = "month-grid";
  for (let cursor = new Date(gridStart); cursor <= gridEnd; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = ymd(cursor);
    const count = counts.get(date) || 0;
    const inTerm = isInTerm(date, bounds);
    const button = document.createElement("button");
    const number = document.createElement("span");
    button.type = "button";
    button.className = `month-day${date.slice(0, 7) === visibleMonth ? "" : " is-outside-month"}${count ? " has-events" : ""}${date === selectedDate ? " is-selected" : ""}`;
    if (count && date.startsWith(visibleMonth)) {
      const fill = d3.rgb(d3.interpolateRgb("#fff1f3", "#8f0c27")(Math.sqrt(count / maxCount)));
      const luminance = [fill.r, fill.g, fill.b]
        .map((value) => value / 255)
        .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
        .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
      button.style.backgroundColor = fill.formatHex();
      if (luminance < .18) button.classList.add("is-dark");
    }
    button.dataset.date = date;
    button.disabled = !inTerm;
    button.setAttribute("aria-label", `${dayLabel.format(cursor)}: ${count} ${count === 1 ? "event" : "events"}`);
    number.className = "month-day-number";
    number.textContent = String(cursor.getUTCDate());
    button.append(number);
    if (count) {
      const badge = document.createElement("span");
      badge.className = "month-day-count";
      badge.dataset.count = String(count);
      badge.textContent = `${count} ${count === 1 ? "event" : "events"}`;
      button.append(badge);
    }
    button.addEventListener("click", () => {
      if (date.slice(0, 7) !== visibleMonth) {
        visibleMonth = date.slice(0, 7);
        renderMonthCalendar(days, bounds, events);
      }
      renderDayList(date);
    });
    grid.append(button);
  }
  root.append(toolbar, weekdays, grid);
  document.querySelector("#calendar-range").textContent = `Academic year ${bounds.startYear}–${String(bounds.startYear + 1).slice(2)} · ${bounds.termStart} through ${bounds.termEnd}`;
}

const typeColors = ["#c91235", "#9f0f2b", "#e06b84", "#3c8cff", "#63666f", "#a71934", "#356da8", "#202127", "#b86b7a", "#7a7e87"];

function involvementLegendKey(label, value, colorClass, highlight, tooltip) {
  const button = document.createElement("button");
  const swatch = document.createElement("i");
  const name = document.createElement("span");
  const stat = document.createElement("strong");
  button.type = "button";
  button.className = "involvement-key";
  button.dataset.highlight = highlight;
  button.dataset.tooltip = tooltip;
  button.setAttribute("aria-label", tooltip);
  swatch.className = colorClass;
  name.textContent = label;
  stat.textContent = value;
  button.append(swatch, name, stat);
  return button;
}

function typeBreakdown(events) {
  const rolls = d3.rollups(events, (rows) => rows.length, (event) => event.event_type || "Other")
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (rolls.length <= 7) return rolls.map(([label, value]) => ({ label, value }));
  const head = rolls.slice(0, 6).map(([label, value]) => ({ label, value }));
  const other = d3.sum(rolls.slice(6), (row) => row[1]);
  head.push({ label: "Other", value: other });
  return head;
}

function weeklySeries(events, bounds) {
  const series = [];
  for (let cursor = new Date(bounds.gridStart); cursor <= bounds.gridEnd; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const start = ymd(weekStart);
    const end = ymd(weekEnd);
    let termDays = 0;
    let activeDays = 0;
    for (let day = new Date(weekStart); day <= weekEnd; day.setUTCDate(day.getUTCDate() + 1)) {
      const date = ymd(day);
      if (!isInTerm(date, bounds)) continue;
      termDays += 1;
      if (eventsForDate(date, events).length) activeDays += 1;
    }
    if (!termDays) continue;
    const weekEvents = events.filter((event) => {
      const eventStart = eventYmd(event.start);
      const eventEnd = eventYmd(event.end);
      return eventStart <= end && eventEnd >= start && eventEnd >= bounds.termStart && eventStart <= bounds.termEnd;
    }).length;
    series.push({
      start,
      end,
      midpoint: new Date(weekStart.getTime() + 3 * 86400000),
      events: weekEvents,
      activeDays,
    });
  }
  return series;
}

function renderTypeDonut(events) {
  const root = document.querySelector("#type-donut");
  root.replaceChildren();
  const data = typeBreakdown(events);
  if (!data.length) {
    root.textContent = "No events for the current filters.";
    return;
  }

  const size = 220;
  const pad = 6;
  const radius = size / 2 - pad;
  const wrap = document.createElement("div");
  wrap.className = "donut-layout";
  root.append(wrap);

  const svg = d3.select(wrap).append("svg")
    .attr("viewBox", `0 0 ${size} ${size}`)
    .attr("role", "group")
    .attr("aria-label", "Event type breakdown");
  const g = svg.append("g").attr("transform", `translate(${size / 2},${size / 2})`);
  const pie = d3.pie().sort(null).value((d) => d.value);
  const arc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius);
  const total = d3.sum(data, (d) => d.value);

  g.selectAll("path")
    .data(pie(data))
    .join("path")
    .attr("class", "chart-mark")
    .attr("data-highlight", (d, i) => `event-type-${i}`)
    .attr("d", arc)
    .attr("fill", (d, i) => typeColors[i % typeColors.length])
    .each(function (d) {
      const pct = total ? Math.round((d.data.value / total) * 100) : 0;
      const label = `${d.data.label}: ${d.data.value} events (${pct}%)`;
      addCellHover(d3.select(this), label);
    });

  g.append("text").attr("class", "donut-center-value").attr("text-anchor", "middle").attr("dy", "-0.12em").text(total);
  g.append("text").attr("class", "donut-center").attr("text-anchor", "middle").attr("dy", "1.2em").text("events");

  const legend = document.createElement("div");
  legend.className = "involvement-legend";
  data.forEach((row, index) => {
    const pct = total ? Math.round((row.value / total) * 100) : 0;
    legend.append(involvementLegendKey(
      row.label,
      String(row.value),
      `event-type-${index % typeColors.length}`,
      `event-type-${index}`,
      `${row.label}: ${row.value} events (${pct}%)`,
    ));
  });
  wrap.append(legend);
  linkLegendHighlights(legend, svg.node());
}

function renderWeeklyChart(events, bounds) {
  const root = document.querySelector("#weekly-chart");
  root.replaceChildren();
  const series = weeklySeries(events, bounds);
  if (!series.length) {
    root.textContent = "No weekly activity in the academic year window.";
    return;
  }

  const width = 560;
  const height = 280;
  const margin = { top: 18, right: 18, bottom: 36, left: 36 };
  const svg = d3.select(root).append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "group")
    .attr("aria-label", "Weekly event volume and active days");

  const x = d3.scalePoint()
    .domain(series.map((row) => row.start))
    .range([margin.left, width - margin.right])
    .padding(0.2);
  const yEvents = d3.scaleLinear()
    .domain([0, Math.max(4, d3.max(series, (row) => row.events) || 0)])
    .nice()
    .range([height - margin.bottom, margin.top]);
  const yActive = d3.scaleLinear()
    .domain([0, 7])
    .range([height - margin.bottom, margin.top]);

  const monthTicks = [];
  const monthTickLabels = new Map();
  let lastMonth = null;
  series.forEach((row) => {
    const label = monthLabel.format(row.midpoint);
    if (label !== lastMonth) {
      const previous = monthTicks[monthTicks.length - 1];
      if (previous && x(row.start) - x(previous) < 28) {
        monthTicks.pop();
        monthTickLabels.delete(previous);
      }
      monthTicks.push(row.start);
      monthTickLabels.set(row.start, label);
      lastMonth = label;
    }
  });

  svg.append("g")
    .attr("class", "weekly-axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickValues(monthTicks).tickFormat((value) => monthTickLabels.get(value)).tickSizeOuter(0));
  svg.append("g")
    .attr("class", "weekly-axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yEvents).ticks(4).tickSizeOuter(0));
  svg.append("g")
    .attr("class", "trend-gridlines")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yEvents).ticks(4).tickSize(-(width - margin.left - margin.right)).tickFormat(""));

  const eventLine = d3.line()
    .x((row) => x(row.start))
    .y((row) => yEvents(row.events));
  const activeLine = d3.line()
    .x((row) => x(row.start))
    .y((row) => yActive(row.activeDays));

  svg.append("path").datum(series).attr("class", "chart-mark").attr("data-highlight", "weekly-events").attr("fill", "none").attr("stroke", "#c91235").attr("stroke-width", 2.5).attr("d", eventLine);
  svg.append("path").datum(series).attr("class", "chart-mark").attr("data-highlight", "weekly-active").attr("fill", "none").attr("stroke", "#3c8cff").attr("stroke-width", 2).attr("stroke-dasharray", "5 4").attr("d", activeLine);

  series.forEach((row) => {
    const label = `Week of ${dayLabel.format(parseYmd(row.start))}: ${row.events} events, ${row.activeDays} active days`;
    const eventMark = svg.append("circle").attr("class", "chart-mark").attr("data-highlight", "weekly-events").attr("cx", x(row.start)).attr("cy", yEvents(row.events)).attr("r", 3.5).attr("fill", "#c91235").attr("stroke", "white").attr("stroke-width", 1);
    addCellHover(eventMark, label);
    const activeMark = svg.append("circle").attr("class", "chart-mark").attr("data-highlight", "weekly-active").attr("cx", x(row.start)).attr("cy", yActive(row.activeDays)).attr("r", 3).attr("fill", "#3c8cff").attr("stroke", "white").attr("stroke-width", 1);
    addCellHover(activeMark, label);
  });

  const eventAverage = (d3.mean(series, (row) => row.events) || 0).toFixed(1);
  const activeAverage = (d3.mean(series, (row) => row.activeDays) || 0).toFixed(1);
  const legend = document.createElement("div");
  legend.className = "involvement-legend weekly-legend";
  legend.append(
    involvementLegendKey("Events / week", `${eventAverage} avg`, "weekly-events", "weekly-events", `Events per week: ${eventAverage} average.`),
    involvementLegendKey("Active days / week (0–7)", `${activeAverage} avg`, "weekly-active", "weekly-active", `Active days per week: ${activeAverage} average.`),
  );
  root.append(legend);
  linkLegendHighlights(legend, svg.node());
}

function refreshView() {
  if (!payloadCache) return;
  const bounds = academicYearBounds();
  const events = filteredEvents();
  const days = dayCountsFromEvents(events);
  const termDays = days.filter((day) => isInTerm(day.date, bounds));
  renderFilters(payloadCache.events);
  updateSummary(events, termDays);
  renderMonthCalendar(days, bounds, events);
  renderDayList(selectedDate && isInTerm(selectedDate, bounds)
    ? selectedDate
    : defaultSelectedDate(days, bounds));
  renderTypeDonut(events);
  renderWeeklyChart(events, bounds);
  finishLoadingState();
  prepareScrollReveals();
}

async function loadCampusEvents() {
  const status = document.querySelector("#data-status");
  try {
    const response = await fetch("/api/v1/campus-involvement/events", {
      cache: "no-cache",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    payloadCache = await response.json();
    const count = document.createElement("strong");
    count.textContent = payloadCache.event_count;
    status.replaceChildren("Loaded ", count, " CampusGroups events.");
  } catch (error) {
    status.textContent = "CampusGroups events unavailable.";
    document.querySelector("#event-filters").replaceChildren();
    document.querySelector("#month-calendar").replaceChildren();
    document.querySelector("#day-event-list").replaceChildren();
    document.querySelector("#selected-day-label").textContent = "Events unavailable";
    finishLoadingState();
    console.error(error);
    return;
  }
  try {
    selectedDate ||= defaultSelectedDate(payloadCache.days, academicYearBounds());
    refreshView();
  } catch (error) {
    status.textContent = "Events loaded; calendar failed to render.";
    console.error(error);
  }
}

showLoadingState();
loadCampusEvents();
window.setInterval(loadCampusEvents, 5 * 60 * 1000);
