document.querySelectorAll("[data-collapsible]").forEach((section, index) => {
  const heading = section.querySelector(":scope > .section-heading");
  const title = heading?.querySelector("h2");
  if (!heading || !title) return;

  const content = document.createElement("div");
  content.className = "collapsible-content";
  content.id = `collapsible-section-${index + 1}`;
  while (heading.nextSibling) content.append(heading.nextSibling);
  section.append(content);

  const button = document.createElement("button");
  button.className = "collapse-toggle";
  button.type = "button";
  const storageKey = `dashboard-section:${window.location.pathname}:${title.id || index}`;
  const savedState = sessionStorage.getItem(storageKey);
  const startsCollapsed = savedState === null ? section.hasAttribute("data-collapsed") : savedState === "true";
  const openLabel = section.dataset.collapseOpen || "Expand section";
  const closeLabel = section.dataset.collapseClose || "Collapse section";
  button.setAttribute("aria-expanded", String(!startsCollapsed));
  button.setAttribute("aria-controls", content.id);
  button.setAttribute("aria-label", `${startsCollapsed ? openLabel : closeLabel}: ${title.textContent}`);
  button.innerHTML = `<span>${startsCollapsed ? openLabel : closeLabel}</span><i aria-hidden="true"></i>`;
  content.hidden = startsCollapsed;
  button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    button.querySelector("span").textContent = expanded ? openLabel : closeLabel;
    button.setAttribute("aria-label", `${expanded ? openLabel : closeLabel}: ${title.textContent}`);
    content.hidden = expanded;
    sessionStorage.setItem(storageKey, String(expanded));
  });
  heading.append(button);
});

function updateHorizontalScroll(element) {
  const overflows = element.scrollWidth > element.clientWidth + 1;
  element.classList.toggle("has-horizontal-overflow", overflows);
  element.tabIndex = overflows ? 0 : -1;
  if (overflows) {
    const chart = !element.classList.contains("table-scroll");
    element.setAttribute("aria-label", chart ? "Scrollable chart" : "Scrollable comparison data");
    element.dataset.scrollHint = chart ? "Swipe to view full chart" : "Swipe to compare";
  } else {
    element.removeAttribute("aria-label");
    delete element.dataset.scrollHint;
  }
}

const horizontalScrollObserver = new ResizeObserver((entries) => entries.forEach(({ target }) => updateHorizontalScroll(target)));

function prepareHorizontalScroll(root = document) {
  root.querySelectorAll(".table-scroll, .trend-visual, .profile-mini-chart, .income-chart, .equity-group").forEach((element) => {
    if (!element.dataset.scrollPrepared) {
      element.dataset.scrollPrepared = "true";
      element.addEventListener("scroll", () => element.classList.toggle("is-scrolled", element.scrollLeft > 8), { passive: true });
      horizontalScrollObserver.observe(element);
    }
    updateHorizontalScroll(element);
  });
}

prepareHorizontalScroll();
new MutationObserver(() => prepareHorizontalScroll()).observe(document.querySelector("main"), { childList: true, subtree: true });

const activeNav = document.querySelector('.section-nav [aria-current="page"]');
if (activeNav) activeNav.parentElement.scrollLeft = activeNav.offsetLeft - (activeNav.parentElement.clientWidth - activeNav.clientWidth) / 2;
