function dataTooltip() {
  let tooltip = document.querySelector("#data-tooltip");
  if (tooltip) return tooltip;
  tooltip = document.createElement("div");
  tooltip.id = "data-tooltip";
  tooltip.className = "data-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  document.body.append(tooltip);
  return tooltip;
}

let tooltipRule;

function dataTooltipRule() {
  if (tooltipRule) return tooltipRule;
  for (const sheet of document.styleSheets) {
    try {
      tooltipRule = [...sheet.cssRules].find((rule) => rule.selectorText === ".data-tooltip");
      if (tooltipRule) return tooltipRule;
    } catch (_) {
      // Ignore stylesheets the browser does not allow scripts to inspect.
    }
  }
}

function positionDataTooltip(clientX, clientY, centered = false) {
  const tooltip = dataTooltip();
  const rule = dataTooltipRule();
  if (!rule) return;

  const gap = 14;
  const edge = 10;
  const bounds = tooltip.getBoundingClientRect();
  let left = centered ? clientX - bounds.width / 2 : clientX + gap;
  let top = centered ? clientY - bounds.height - gap : clientY + gap;

  if (!centered && left + bounds.width > innerWidth - edge) left = clientX - bounds.width - gap;
  if (top < edge || top + bounds.height > innerHeight - edge) top = clientY - bounds.height - gap;

  left = Math.max(edge, Math.min(left, innerWidth - bounds.width - edge));
  top = Math.max(edge, Math.min(top, innerHeight - bounds.height - edge));
  rule.style.left = `${Math.round(left)}px`;
  rule.style.top = `${Math.round(top)}px`;
}

function showDataTooltip(label, clientX, clientY, centered = false) {
  const tooltip = dataTooltip();
  tooltip.textContent = label;
  tooltip.hidden = false;
  positionDataTooltip(clientX, clientY, centered);
}

function showDataTooltipForElement(element, label) {
  const bounds = element.getBoundingClientRect();
  showDataTooltip(label, bounds.left + bounds.width / 2, bounds.top, true);
}

function hideDataTooltip() {
  dataTooltip().hidden = true;
}

function linkLegendHighlights(legend, chart) {
  const items = [...legend.querySelectorAll("[data-highlight]")];
  const marks = [...chart.querySelectorAll("[data-highlight]")];
  const targets = [...items, ...chart.querySelectorAll("[data-highlight][tabindex]")];

  function highlight(key) {
    [...items, ...marks].forEach((element) => {
      element.classList.toggle("is-highlighted", element.dataset.highlight === key);
      element.classList.toggle("is-muted", element.dataset.highlight !== key);
    });
  }

  function clearHighlight() {
    [...items, ...marks].forEach((element) => element.classList.remove("is-highlighted", "is-muted"));
    hideDataTooltip();
  }

  function clear(target) {
    if (document.activeElement?.dataset.highlight === target.dataset.highlight) return;
    clearHighlight();
  }

  targets.forEach((target) => {
    target.addEventListener("pointerenter", (event) => {
      highlight(target.dataset.highlight);
      if (target.dataset.tooltip) showDataTooltip(target.dataset.tooltip, event.clientX, event.clientY);
    });
    target.addEventListener("pointerleave", () => clear(target));
    target.addEventListener("focus", () => {
      highlight(target.dataset.highlight);
      if (target.dataset.tooltip) showDataTooltipForElement(target, target.dataset.tooltip);
    });
    target.addEventListener("blur", () => clear(target));
  });
}
