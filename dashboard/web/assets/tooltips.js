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

function positionDataTooltip() {}

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
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "legend-reset";
  reset.textContent = "Reset highlight";
  reset.hidden = true;
  legend.append(reset);

  function highlight(key) {
    [...items, ...marks].forEach((element) => {
      element.classList.toggle("is-highlighted", element.dataset.highlight === key);
      element.classList.toggle("is-muted", element.dataset.highlight !== key);
    });
    reset.hidden = false;
  }

  function clearHighlight() {
    [...items, ...marks].forEach((element) => element.classList.remove("is-highlighted", "is-muted"));
    reset.hidden = true;
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
  reset.addEventListener("click", clearHighlight);
}
