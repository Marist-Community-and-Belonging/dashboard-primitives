const revealObserver = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ? null
  : new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });

function prepareScrollReveals(root = document) {
  const items = root.querySelectorAll(".metric, .composition-row, .access-card, .trend-card, .gap-row:not(.gap-header), .equity-group, .chart-reveal, .profile-panel, .profile-trend-card");
  items.forEach((item, index) => {
    if (item.classList.contains("reveal-item")) return;
    item.classList.add("reveal-item");
    item.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 45}ms`);
    if (revealObserver) revealObserver.observe(item);
    else item.classList.add("is-visible");
  });
}
