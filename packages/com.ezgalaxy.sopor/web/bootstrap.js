(function () {
  const showFatal = (title, err) => {
    try {
      const app = document.getElementById("app") || document.body;
      const box = document.createElement("div");
      box.style.position = "fixed";
      box.style.inset = "12px";
      box.style.padding = "12px";
      box.style.background = "rgba(0,0,0,0.75)";
      box.style.border = "1px solid rgba(255,77,242,0.35)";
      box.style.color = "rgba(255,255,255,0.95)";
      box.style.fontFamily = "ui-monospace, Menlo, Consolas, monospace";
      box.style.fontSize = "12px";
      box.style.whiteSpace = "pre-wrap";
      box.style.zIndex = "999999";
      const msg = err && (err.stack || err.message || String(err));
      box.textContent = `[Sopor bootstrap] ${title}\n\n${msg || "(no details)"}`;
      app.appendChild(box);
    } catch {
      // ignore
    }
  };

  window.addEventListener("error", (e) => {
    // Resource errors sometimes come through with target/src.
    const anyE = /** @type {any} */ (e);
    const src = anyE?.target?.src || anyE?.target?.href;
    if (src) showFatal("Resource failed to load", src);
    else showFatal("Runtime error", anyE?.error || anyE?.message || e);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const anyE = /** @type {any} */ (e);
    showFatal("Unhandled promise rejection", anyE?.reason || e);
  });

  // Helpful hint: import maps support varies by browser.
  try {
    // @ts-ignore
    if (typeof HTMLScriptElement !== "undefined" && HTMLScriptElement.supports && !HTMLScriptElement.supports("importmap")) {
      showFatal("Browser lacks importmap support", "Your browser does not support <script type=importmap>. Use a modern Chromium/Firefox, or we must rewrite addon imports.");
    }
  } catch {
    // ignore
  }

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

  // Use a static <script type="module"> which works properly with import maps.
  // Dynamic import() doesn't always respect the page's import map for nested imports.
  const loadModule = (src) => {
    const s = document.createElement("script");
    s.type = "module";
    s.src = src;
    s.onerror = (e) => {
      showFatal(`Failed to load module script: ${src}`, e);
    };
    document.head.appendChild(s);
  };

  if (engine === "2d") {
    // Legacy Phaser build
    loadScript("vendor/phaser.min.js")
      .then(() => loadScript("weapons.js"))
      .then(() => loadScript("app.js"))
      .catch((err) => {
        console.error("Failed to load 2D engine", err);
        showFatal("Failed to load 2D engine", err);
      });
    return;
  }

  // Default: new 3D engine (Three.js)
  loadModule("app3d.js");
})();
