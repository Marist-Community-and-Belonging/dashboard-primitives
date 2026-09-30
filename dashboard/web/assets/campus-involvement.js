dataTooltip();

const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const shortTime = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const easternYmd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });

let selectedDate = null;
let payloadCache = null;
let selectedTypes = new Set();
let onCampusOnly = false;
let resizeTimer = 0;

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

/** Academic year block: Mon on/before Aug 24 → Fri on/after May 21. Skips summer. */
function academicYearBounds(ref = new Date()) {
  const [year, month, day] = easternYmd.format(ref).split("-").map(Number);
  const today = Date.UTC(year, month - 1, day);
  const may21 = Date.UTC(year, 4, 21);
  const aug24 = Date.UTC(year, 7, 24);
  let startYear = year;
  if (today < may21) startYear = year - 1;
  else if (today >= may21 && today < aug24) startYear = year;
  else startYear = year;

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

function filteredEvents() {
  if (!payloadCache) return [];
  return payloadCache.events.filter((event) => {
    if (selectedTypes.size && !selectedTypes.has(event.event_type || "Other")) return false;
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

function renderDayList(date) {
  selectedDate = date;
  document.querySelector("#selected-day-label").textContent = dayLabel.format(parseYmd(date));
  const list = document.querySelector("#day-event-list");
  const empty = document.querySelector("#day-empty");
  list.replaceChildren();
  const events = eventsForDate(date);
  empty.hidden = events.length > 0;
  events.forEach((event) => {
    const item = document.createElement("article");
    item.className = "event-item";
    const title = event.link
      ? `<a href="${event.link}" target="_blank" rel="noopener">${event.title}</a>`
      : event.title;
    const meta = [event.group, event.event_type, event.location].filter(Boolean).join(" · ");
    item.innerHTML = `<p class="event-time">${eventTimeLabel(event)}</p><div class="event-body"><h3 class="event-title">${title}</h3><p class="event-meta">${meta || "—"}</p></div>`;
    list.append(item);
  });
  d3.selectAll(".day-cell").classed("is-selected", function () {
    return this.dataset.date === date;
  });
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
  const types = d3.rollups(
    events,
    (rows) => rows.length,
    (event) => event.event_type || "Other",
  ).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  root.replaceChildren();
  const typeWrap = document.createElement("div");
  typeWrap.className = "filter-row";
  typeWrap.setAttribute("aria-label", "Event type filters");

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = `filter-chip${selectedTypes.size ? "" : " is-active"}`;
  allButton.textContent = `All types (${events.length})`;
  allButton.addEventListener("click", () => {
    selectedTypes = new Set();
    refreshView();
  });
  typeWrap.append(allButton);

  types.slice(0, 8).forEach(([type, count]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-chip${selectedTypes.has(type) ? " is-active" : ""}`;
    button.textContent = `${type} (${count})`;
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
  const campus = document.createElement("button");
  campus.type = "button";
  campus.className = `filter-chip${onCampusOnly ? " is-active" : ""}`;
  campus.textContent = "On-campus only";
  campus.addEventListener("click", () => {
    onCampusOnly = !onCampusOnly;
    refreshView();
  });
  placeWrap.append(campus);
  root.append(placeWrap);
}

function renderHeatmap(days, bounds) {
  const root = document.querySelector("#events-heatmap");
  root.replaceChildren();
  const counts = new Map(days.map((day) => [day.date, day.count]));

  const calendarDays = [];
  for (let cursor = new Date(bounds.gridStart); cursor <= bounds.gridEnd; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = ymd(cursor);
    calendarDays.push({
      date,
      count: counts.get(date) || 0,
      time: new Date(cursor),
      inTerm: isInTerm(date, bounds),
    });
  }

  const weeks = d3.groups(calendarDays, (day) => startOfUtcWeek(day.time).getTime());
  const termCounts = calendarDays.filter((day) => day.inTerm).map((day) => day.count);
  const maxCount = d3.max(termCounts) || 1;
  const color = d3.scaleThreshold()
    .domain([1, Math.max(2, Math.ceil(maxCount * 0.4)), Math.max(3, Math.ceil(maxCount * 0.7))])
    .range(["#eceef1", "#f4c7d0", "#e06b84", "#c91235"]);

  const left = 36;
  const top = 22;
  const right = 18;
  const gap = 3;
  const available = Math.max(root.clientWidth || 640, 280) - left - right;
  const step = Math.max(10, Math.min(16, available / weeks.length));
  const cell = Math.max(8, step - gap);
  const width = left + weeks.length * step + right;
  const height = top + 7 * step + 8;
  const svg = d3.select(root).append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%")
    .attr("role", "group")
    .attr("aria-label", "Campus events academic year heatmap");

  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((label, index) => {
    if (index % 2 === 1) {
      svg.append("text")
        .attr("class", "weekday-label")
        .attr("x", 0)
        .attr("y", top + index * step + cell - 2)
        .text(label);
    }
  });

  const monthSpans = new Map();
  weeks.forEach(([, weekDays], weekIndex) => {
    const termDays = weekDays.filter((day) => day.inTerm);
    const anchor = (termDays.find((day) => day.time.getUTCDay() === 3) || termDays[0]
      || weekDays.find((day) => day.time.getUTCDay() === 3) || weekDays[0]);
    const key = `${anchor.time.getUTCFullYear()}-${anchor.time.getUTCMonth()}`;
    if (!monthSpans.has(key)) {
      monthSpans.set(key, { label: monthLabel.format(anchor.time), start: weekIndex, end: weekIndex });
    } else {
      monthSpans.get(key).end = weekIndex;
    }
  });

  monthSpans.forEach((span) => {
    const mid = (span.start + span.end) / 2;
    const x = Math.min(width - 4, Math.max(left, left + mid * step + cell / 2));
    svg.append("text")
      .attr("class", "month-label")
      .attr("text-anchor", "middle")
      .attr("x", x)
      .attr("y", 12)
      .text(span.label);
  });

  weeks.forEach(([, weekDays], weekIndex) => {
    weekDays.forEach((day) => {
      const label = day.inTerm
        ? `${dayLabel.format(day.time)}: ${day.count} ${day.count === 1 ? "event" : "events"}`
        : `${dayLabel.format(day.time)}: outside academic term`;
      const cellNode = svg.append("rect")
        .attr("class", `day-cell chart-mark${day.inTerm ? "" : " is-out-of-term"}`)
        .attr("data-date", day.date)
        .attr("x", left + weekIndex * step)
        .attr("y", top + day.time.getUTCDay() * step)
        .attr("width", cell)
        .attr("height", cell)
        .attr("rx", 2)
        .attr("fill", day.inTerm ? color(day.count) : "#f3f4f5")
        .attr("opacity", day.inTerm ? 1 : 0.35);
      addCellHover(cellNode, label);
      if (day.inTerm) {
        cellNode.on("click", () => renderDayList(day.date));
        cellNode.on("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            renderDayList(day.date);
          }
        });
      } else {
        cellNode.attr("tabindex", null).attr("role", null);
      }
    });
  });

  document.querySelector("#heatmap-range").textContent =
    `Academic year ${bounds.startYear}–${String(bounds.startYear + 1).slice(2)} · ${bounds.termStart} through ${bounds.termEnd} · max ${maxCount} events in a day`;
}

const typeColors = ["#c91235", "#9f0f2b", "#e06b84", "#3c8cff", "#63666f", "#a71934", "#356da8", "#202127", "#b86b7a", "#7a7e87"];

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
    .attr("d", arc)
    .attr("fill", (d, i) => typeColors[i % typeColors.length])
    .each(function (d) {
      const pct = total ? Math.round((d.data.value / total) * 100) : 0;
      const label = `${d.data.label}: ${d.data.value} events (${pct}%)`;
      addCellHover(d3.select(this), label);
    });

  g.append("text").attr("class", "donut-center-value").attr("text-anchor", "middle").attr("dy", "-0.12em").text(total);
  g.append("text").attr("class", "donut-center").attr("text-anchor", "middle").attr("dy", "1.2em").text("events");

  const legend = document.createElement("ul");
  legend.className = "involvement-legend";
  data.forEach((row, index) => {
    const item = document.createElement("li");
    item.innerHTML = `<i style="background:${typeColors[index % typeColors.length]}"></i><span>${row.label}</span><strong>${row.value}</strong>`;
    legend.append(item);
  });
  wrap.append(legend);
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
  let lastMonth = null;
  series.forEach((row) => {
    const label = monthLabel.format(row.midpoint);
    if (label !== lastMonth) {
      monthTicks.push(row.start);
      lastMonth = label;
    }
  });

  svg.append("g")
    .attr("class", "weekly-axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickValues(monthTicks).tickFormat((value) => monthLabel.format(parseYmd(value))).tickSizeOuter(0));
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

  svg.append("path").datum(series).attr("fill", "none").attr("stroke", "#c91235").attr("stroke-width", 2.5).attr("d", eventLine);
  svg.append("path").datum(series).attr("fill", "none").attr("stroke", "#3c8cff").attr("stroke-width", 2).attr("stroke-dasharray", "5 4").attr("d", activeLine);

  series.forEach((row) => {
    const label = `Week of ${dayLabel.format(parseYmd(row.start))}: ${row.events} events, ${row.activeDays} active days`;
    const eventMark = svg.append("circle").attr("class", "chart-mark").attr("cx", x(row.start)).attr("cy", yEvents(row.events)).attr("r", 3.5).attr("fill", "#c91235").attr("stroke", "white").attr("stroke-width", 1);
    addCellHover(eventMark, label);
    const activeMark = svg.append("circle").attr("class", "chart-mark").attr("cx", x(row.start)).attr("cy", yActive(row.activeDays)).attr("r", 3).attr("fill", "#3c8cff").attr("stroke", "white").attr("stroke-width", 1);
    addCellHover(activeMark, label);
  });

  const legend = document.createElement("ul");
  legend.className = "involvement-legend weekly-legend";
  legend.innerHTML = `
    <li><i style="background:#c91235"></i><span>Events / week</span><strong>${(d3.mean(series, (row) => row.events) || 0).toFixed(1)} avg</strong></li>
    <li><i style="background:#3c8cff"></i><span>Active days / week</span><strong>${(d3.mean(series, (row) => row.activeDays) || 0).toFixed(1)} avg</strong></li>`;
  root.append(legend);
}

function refreshView() {
  if (!payloadCache) return;
  const bounds = academicYearBounds();
  const events = filteredEvents();
  const days = dayCountsFromEvents(events);
  const termDays = days.filter((day) => isInTerm(day.date, bounds));
  renderFilters(payloadCache.events);
  updateSummary(events, termDays);
  renderHeatmap(days, bounds);
  renderTypeDonut(events);
  renderWeeklyChart(events, bounds);
  renderDayList(selectedDate && isInTerm(selectedDate, bounds)
    ? selectedDate
    : defaultSelectedDate(days, bounds));
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
    status.innerHTML = `Loaded <strong>${payloadCache.event_count}</strong> public CampusGroups events.`;
  } catch (error) {
    status.textContent = "CampusGroups events feed is unavailable right now.";
    console.error(error);
    return;
  }
  try {
    selectedDate = defaultSelectedDate(payloadCache.days, academicYearBounds());
    refreshView();
  } catch (error) {
    status.textContent = "Events loaded, but the calendar failed to render.";
    console.error(error);
  }
}

loadCampusEvents();
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    if (payloadCache) {
      const bounds = academicYearBounds();
      const events = filteredEvents();
      const days = dayCountsFromEvents(events);
      renderHeatmap(days, bounds);
      renderTypeDonut(events);
      renderWeeklyChart(events, bounds);
      if (selectedDate) renderDayList(selectedDate);
    }
  }, 120);
});
