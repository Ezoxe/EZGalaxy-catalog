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
      let msg = "";
      if (err) {
        if (err instanceof Event) {
          // For Event objects (like script load errors), extract useful info
          const target = err.target;
          if (target && target.src) {
            msg = `Failed to load: ${target.src}`;
          } else if (target && target.href) {
            msg = `Failed to load: ${target.href}`;
          } else {
            msg = `Event type: ${err.type || "unknown"}`;
          }
        } else {
          msg = err.stack || err.message || String(err);
        }
      }
      box.textContent = `[Sopor bootstrap] ${title}\n\n${msg || "(no details)"}`;
      app.appendChild(box);
    } catch {
      // ignore
    }
  };

  window.addEventListener("error", (e) => {
    const anyE = /** @type {any} */ (e);
    const src = anyE?.target?.src || anyE?.target?.href;
    if (src) showFatal("Resource failed to load", src);
    else showFatal("Runtime error", anyE?.error || anyE?.message || e);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const anyE = /** @type {any} */ (e);
    showFatal("Unhandled promise rejection", anyE?.reason || e);
  });

  // Compute the base URL for vendor files (same directory as this script / the HTML)
  const baseUrl = new URL(".", document.currentScript ? document.currentScript.src : location.href).href;

  // Dynamically inject import map with absolute URLs before loading any modules
  const injectImportMap = () => {
    const map = {
      imports: {
        "three": baseUrl + "vendor/three.module.js",
        "three/addons/": baseUrl + "vendor/three-addons/"
      }
    };
    const script = document.createElement("script");
    script.type = "importmap";
    script.textContent = JSON.stringify(map);
    document.head.appendChild(script);
  };

  // Import maps must be injected before any module loading
  try {
    injectImportMap();
  } catch (e) {
    showFatal("Failed to inject import map", e);
  }

  // Check import map support
  try {
    if (typeof HTMLScriptElement !== "undefined" && HTMLScriptElement.supports && !HTMLScriptElement.supports("importmap")) {
      showFatal("Browser lacks importmap support", "Your browser does not support <script type=importmap>. Use a modern Chromium/Firefox.");
    }
  } catch {
    // ignore
  }

  const url = new URL(location.href);
  const params = url.searchParams;
  const rawEngine = (params.get("engine") || "").toLowerCase();
  // v2 = new modular architecture, 2d = legacy Phaser, 3d = Three.js
  const engine = rawEngine === "2d" ? "2d" : rawEngine === "3d" ? "3d" : "v2";

  // Canonicalize: treat `?engine=v2` as the base URL and strip it.
  if (rawEngine === "v2" || rawEngine === "") {
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
    s.src = baseUrl + src;
    s.onerror = (e) => {
      showFatal(`Failed to load module script: ${src}`, e);
    };
    document.head.appendChild(s);
  };

  // Legacy 2D engine (Phaser)
  if (engine === "2d") {
    loadScript("vendor/phaser.min.js")
      .then(() => loadScript("weapons.js"))
      .then(() => loadScript("app.js"))
      .catch((err) => {
        console.error("Failed to load 2D engine", err);
        showFatal("Failed to load 2D engine", err);
      });
    return;
  }

  // 3D engine (Three.js)
  if (engine === "3d") {
    loadModule("app3d.js");
    return;
  }

  // Default: new modular v2 architecture (ES6 modules, Canvas 2D)
  loadModule("app-v2.js");
})();
