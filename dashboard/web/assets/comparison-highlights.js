function favorableComparison(record) {
  const direction = record.favorable_direction;
  const median = record.peer?.median;
  if (!direction || !Number.isFinite(record.value) || !Number.isFinite(median)) return null;
  const favorable = direction === "lower" ? record.value < median : record.value > median;
  if (!favorable) return null;
  return {
    difference: Math.abs(record.value - median),
    position: direction === "lower" ? "below" : "above",
  };
}

function applyFavorableHighlight(element, record) {
  const comparison = favorableComparison(record);
  if (!comparison) return null;
  element.classList.add("is-favorable");
  return comparison;
}
