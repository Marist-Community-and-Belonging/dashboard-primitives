(() => {
  const selector = [
    "#overview-snapshot", "#metric-grid", "#overview-trends",
    "#profile-enrollment-values", "#profile-composition-chart", "#profile-outcome-values", "#profile-affordability-values", "#profile-trends",
    "#composition-chart", "#access-grid", "#diversity-trend", "#scatterplot",
    "#outcome-grid", "#success-trends", "#equity-chart",
    "#affordability-grid", "#income-chart", "#affordability-trends",
  ].join(",");

  const targets = () => document.querySelectorAll(selector);
  const start = () => {
    document.querySelectorAll(".release-summary dd").forEach((value) => value.classList.add("skeleton", "loading-value"));
    targets().forEach((target) => {
      target.classList.add("dashboard-loading-target");
      target.setAttribute("aria-busy", "true");
    });
  };
  const finish = () => {
    document.querySelectorAll(".release-summary dd").forEach((value) => value.classList.remove("skeleton", "loading-value"));
    targets().forEach((target) => {
      target.classList.remove("dashboard-loading-target");
      target.removeAttribute("aria-busy");
    });
  };

  window.dashboardLoading = { start, finish };
  start();
})();
