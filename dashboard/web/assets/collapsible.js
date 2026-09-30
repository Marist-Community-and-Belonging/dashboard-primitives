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
  const startsCollapsed = section.hasAttribute("data-collapsed");
  const openLabel = section.dataset.collapseOpen || "Expand section";
  const closeLabel = section.dataset.collapseClose || "Collapse section";
  button.setAttribute("aria-expanded", String(!startsCollapsed));
  button.setAttribute("aria-controls", content.id);
  button.innerHTML = `<span>${startsCollapsed ? openLabel : closeLabel}</span><i aria-hidden="true"></i>`;
  content.hidden = startsCollapsed;
  button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    button.querySelector("span").textContent = expanded ? openLabel : closeLabel;
    content.hidden = expanded;
  });
  heading.append(button);
});
