(function() {
  var s = document.createElement('script');
  s.src = './api/ezgalaxy-sdk.js';
  s.onerror = function() { /* SDK not available in dev/standalone mode */ };
  document.head.appendChild(s);
})();
