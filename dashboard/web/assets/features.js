window.dashboardFeaturesReady = fetch("/api/v1/features", { headers: { Accept: "application/json" } })
  .then((response) => {
    return response.ok ? response.json() : { features: {} };
  })
  .then(({ features }) => {
    document.querySelectorAll("[data-feature]").forEach((section) => {
      section.hidden = features[section.dataset.feature] === false;
    });
    return features;
  })
  .catch(() => ({}));
