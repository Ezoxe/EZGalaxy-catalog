(function () {
  var overlay = null;
  function getOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('pre');
    overlay.id = 'ez-error-overlay';
    overlay.style.cssText =
      'position:fixed;bottom:0;left:0;right:0;max-height:40vh;overflow:auto;' +
      'margin:0;padding:12px 16px;font:12px/1.6 monospace;color:#fca5a5;' +
      'background:rgba(127,29,29,0.92);border-top:2px solid #ef4444;z-index:99999;display:none;';
    document.body.appendChild(overlay);
    return overlay;
  }
  window.__ezShowError = function (msg) {
    var el = getOverlay();
    el.style.display = 'block';
    el.textContent += (el.textContent ? '\n---\n' : '') + msg;
  };
  window.__ezScriptError = function (src) {
    window.__ezShowError('Script failed to load: ' + src);
  };
  window.onerror = function (msg, src, line, col, err) {
    var txt = 'Error: ' + msg + '\nSource: ' + src + ':' + line + ':' + col;
    if (err && err.stack) txt += '\n' + err.stack;
    window.__ezShowError(txt);
  };
  window.onunhandledrejection = function (e) {
    var r = e.reason;
    window.__ezShowError('Unhandled rejection: ' + (r && r.stack ? r.stack : r));
  };
})();
