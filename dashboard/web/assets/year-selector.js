function updateCollectionLinks(year) {
  document.querySelectorAll(".identity, .section-nav a").forEach((link) => {
    const url = new URL(link.href, window.location.origin);
    url.searchParams.set("year", year);
    link.href = `${url.pathname}${url.search}`;
  });
}

function updateCollectionURL(year, replace = false) {
  const url = new URL(window.location.href);
  url.searchParams.set("year", year);
  window.history[replace ? "replaceState" : "pushState"]({}, "", url);
  updateCollectionLinks(year);
}

async function setupCollectionYearSelector(onChange) {
  const response = await fetch("/api/v1/overview/releases", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Release catalog request failed with ${response.status}`);
  const catalog = await response.json();
  const requestedYear = new URLSearchParams(window.location.search).get("year");
  const selectedYear = catalog.releases.some((release) => release.collection_year === requestedYear)
    ? requestedYear
    : catalog.default_year;
  const select = document.querySelector("#year-select");
  select.replaceChildren();
  catalog.releases.forEach((release) => {
    const option = document.createElement("option");
    option.value = release.collection_year;
    option.textContent = `${release.collection_year} · ${release.release_type.replace(/^./, (letter) => letter.toUpperCase())}`;
    select.append(option);
  });
  select.value = selectedYear;
  select.disabled = catalog.releases.length < 2;
  const availability = document.querySelector("#year-availability");
  if (availability) availability.textContent = `${catalog.releases.length} validated final collections available.`;
  updateCollectionURL(selectedYear, true);
  select.addEventListener("change", async () => {
    const previousYear = new URLSearchParams(window.location.search).get("year") || selectedYear;
    const nextYear = select.value;
    document.documentElement.classList.add("is-year-changing");
    select.disabled = true;
    try {
      await onChange(nextYear);
      updateCollectionURL(nextYear);
    } catch (error) {
      select.value = previousYear;
    } finally {
      window.setTimeout(() => {
        document.documentElement.classList.remove("is-year-changing");
        select.disabled = catalog.releases.length < 2;
      }, 80);
    }
  });
  window.addEventListener("popstate", async () => {
    const historyYear = new URLSearchParams(window.location.search).get("year");
    if (!catalog.releases.some((release) => release.collection_year === historyYear) || historyYear === select.value) return;
    const previousYear = select.value;
    select.value = historyYear;
    document.documentElement.classList.add("is-year-changing");
    select.disabled = true;
    try {
      await onChange(historyYear);
      updateCollectionLinks(historyYear);
    } catch (error) {
      select.value = previousYear;
    } finally {
      window.setTimeout(() => {
        document.documentElement.classList.remove("is-year-changing");
        select.disabled = catalog.releases.length < 2;
      }, 80);
    }
  });
  return { ...catalog, selectedYear };
}
