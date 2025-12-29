(function () {
  const url = new URL(location.href);
  const params = url.searchParams;
  const rawEngine = (params.get("engine") || "").toLowerCase();
  const engine = rawEngine === "2d" ? "2d" : "3d";

  // Canonicalize: treat `?engine=3d` as the base URL and strip it.
  if (rawEngine === "3d") {
    try {
      params.delete("engine");
      url.search = params.toString();
      history.replaceState(null, "", url.toString());
    } catch {
      // ignore
    }
  }

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });

  const loadModule = (src) => {
    const s = document.createElement("script");
    s.type = "module";
    s.src = src;
    document.head.appendChild(s);
  };

  if (engine === "2d") {
    // Legacy Phaser build
    loadScript("vendor/phaser.min.js")
      .then(() => loadScript("weapons.js"))
      .then(() => loadScript("app.js"))
      .catch((err) => {
        console.error("Failed to load 2D engine", err);
      });
    return;
  }

  // Default: new 3D engine (Three.js)
  loadModule("app3d.js");
})();
