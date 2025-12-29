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

  const loadModule = async (src) => {
    const moduleUrl = new URL(src, location.href);

    /** @type {{url: string, status: number, statusText: string, contentType: string, redirected: boolean, finalUrl: string, peek: string} | null} */
    let probe = null;

    // First, probe the resource to surface 404/fallback issues.
    try {
      const r = await fetch(moduleUrl.href, { cache: "no-store" });
      if (!r.ok) {
        showFatal(`Failed to fetch module: ${src}`, `HTTP ${r.status} ${r.statusText}\nURL: ${moduleUrl.href}`);
        return;
      }
      const ct = r.headers.get("content-type") || "(none)";
      const text = await r.text();
      const peek = text.slice(0, 220).replace(/\s+/g, " ");
      probe = {
        url: moduleUrl.href,
        status: r.status,
        statusText: r.statusText,
        contentType: ct,
        redirected: r.redirected,
        finalUrl: r.url || moduleUrl.href,
        peek,
      };

      if (peek.toLowerCase().includes("<!doctype") || peek.toLowerCase().includes("<html")) {
        showFatal(`Module served as HTML: ${src}`, `Content-Type: ${ct}\nURL: ${moduleUrl.href}\nFirst chars: ${peek}`);
        return;
      }

      // ES modules require a JS MIME type when servers send X-Content-Type-Options: nosniff.
      // Many API/static gateways incorrectly serve .js as application/octet-stream or text/plain.
      const ctLower = ct.toLowerCase();
      const looksJs = ctLower.includes("javascript") || ctLower.includes("ecmascript") || ctLower.includes("module");
      if (!looksJs) {
        showFatal(`Bad module Content-Type for ${src}`, `Content-Type: ${ct}\nURL: ${probe.finalUrl}\nFirst chars: ${peek}`);
        return;
      }
    } catch (e) {
      showFatal(`Failed to fetch module: ${src}`, e);
      return;
    }

    // Then, import it to get a real error message if dependencies fail.
    try {
      await import(moduleUrl.href);
    } catch (e) {
      if (probe) {
        showFatal(
          `Failed to import module: ${src}`,
          `${e && (e.stack || e.message) ? (e.stack || e.message) : String(e)}\n\nProbe:\n- status: ${probe.status} ${probe.statusText}\n- content-type: ${probe.contentType}\n- redirected: ${probe.redirected}\n- final url: ${probe.finalUrl}\n- first chars: ${probe.peek}`
        );
      } else {
        showFatal(`Failed to import module: ${src}`, e);
      }
    }
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
