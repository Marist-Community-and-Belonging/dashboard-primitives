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

function positionDataTooltip(clientX, clientY, centered = false) {
  const tooltip = dataTooltip();
  const offset = 14;
  const edge = 10;
  const bounds = tooltip.getBoundingClientRect();
  let left = centered ? clientX - bounds.width / 2 : clientX + offset;
  let top = centered ? clientY - bounds.height - offset : clientY + offset;

  if (!centered && left + bounds.width > window.innerWidth - edge) left = clientX - bounds.width - offset;
  if (!centered && top + bounds.height > window.innerHeight - edge) top = clientY - bounds.height - offset;
  left = Math.max(edge, Math.min(left, window.innerWidth - bounds.width - edge));
  top = Math.max(edge, Math.min(top, window.innerHeight - bounds.height - edge));
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
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
