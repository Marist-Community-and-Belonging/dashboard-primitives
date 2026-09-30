window.dashboardFeaturesReady = fetch("/api/v1/features", { headers: { Accept: "application/json" } })
  .then((response) => {
    if (!response.ok) throw new Error(`Feature request failed with ${response.status}`);
    return response.json();
  })
  .then(({ features }) => {
    document.querySelectorAll("[data-feature]").forEach((section) => {
      section.hidden = features[section.dataset.feature] === false;
    });
    return features;
  })
  .catch((error) => {
    console.error(error);
    return {};
  });
