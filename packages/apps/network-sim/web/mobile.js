/* ============================================================
   Network Sim — mobile.js
   Touch support, hamburger menu, pinch-to-zoom, gestures
   ============================================================ */

/* ─── Hamburger sidebar toggle ─── */
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sidebarBackdrop');
  if (!sb) return;
  const open = sb.classList.toggle('open');
  if (bd) bd.classList.toggle('visible', open);
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarBackdrop')?.classList.remove('visible');
}

/* ─── Touch state ─── */
var touchState = {
  pinching: false,
  lastPinchDist: 0,
  lastTouchX: 0,
  lastTouchY: 0,
  isPanning: false,
  longPressTimer: null,
  longPressTarget: null
};

/* ─── Pinch-to-zoom + two-finger pan on canvas ─── */
function setupCanvasTouch() {
  const cvs = document.getElementById('networkCanvas');
  if (!cvs) return;

  cvs.addEventListener('touchstart', onCanvasTouchStart, { passive: false });
  cvs.addEventListener('touchmove', onCanvasTouchMove, { passive: false });
  cvs.addEventListener('touchend', onCanvasTouchEnd, { passive: false });
}

function onCanvasTouchStart(e) {
  if (e.touches.length === 2) {
    e.preventDefault();
    touchState.pinching = true;
    touchState.lastPinchDist = getPinchDist(e.touches);
    const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    touchState.lastTouchX = mx;
    touchState.lastTouchY = my;
  } else if (e.touches.length === 1) {
    // Long-press detection for context menu
    const touch = e.touches[0];
    touchState.longPressTimer = setTimeout(() => {
      onCanvasLongPress(touch);
    }, 600);
    touchState.lastTouchX = touch.clientX;
    touchState.lastTouchY = touch.clientY;
  }
}

function onCanvasTouchMove(e) {
  clearTimeout(touchState.longPressTimer);
  touchState.longPressTimer = null;

  if (e.touches.length === 2 && touchState.pinching) {
    e.preventDefault();
    const dist = getPinchDist(e.touches);
    const scale = dist / touchState.lastPinchDist;
    const newZoom = Math.min(3, Math.max(0.2, zoomLevel * scale));

    // Zoom toward midpoint
    const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    const rect = document.getElementById('networkCanvas').getBoundingClientRect();
    const cx = (mx - rect.left) / zoomLevel + viewportX;
    const cy = (my - rect.top) / zoomLevel + viewportY;

    zoomLevel = newZoom;
    viewportX = cx - (mx - rect.left) / zoomLevel;
    viewportY = cy - (my - rect.top) / zoomLevel;

    // Pan with two fingers
    const dmx = mx - touchState.lastTouchX;
    const dmy = my - touchState.lastTouchY;
    viewportX -= dmx / zoomLevel;
    viewportY -= dmy / zoomLevel;

    touchState.lastPinchDist = dist;
    touchState.lastTouchX = mx;
    touchState.lastTouchY = my;
  }
}

function onCanvasTouchEnd(e) {
  clearTimeout(touchState.longPressTimer);
  touchState.longPressTimer = null;
  if (e.touches.length < 2) touchState.pinching = false;
}

function getPinchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/* ─── Long-press → show node info (replaces right-click) ─── */
function onCanvasLongPress(touch) {
  const rect = document.getElementById('networkCanvas').getBoundingClientRect();
  const wx = (touch.clientX - rect.left) / zoomLevel + viewportX;
  const wy = (touch.clientY - rect.top) / zoomLevel + viewportY;
  const node = nodes.find(n => {
    const dx = n.x - wx, dy = n.y - wy;
    return Math.sqrt(dx * dx + dy * dy) < 30;
  });
  if (node) {
    showNodeInfo(node);
    // Haptic feedback if supported
    if (navigator.vibrate) navigator.vibrate(30);
  }
}

/* ─── Bottom sheet info panel for mobile ─── */
function setupBottomSheet() {
  const panel = document.getElementById('infoPanel');
  if (!panel) return;
  let startY = 0, currentY = 0, dragging = false;

  panel.addEventListener('touchstart', (e) => {
    const handle = panel.querySelector('.bottom-sheet-handle');
    if (!handle || !handle.contains(e.target)) return;
    startY = e.touches[0].clientY;
    dragging = true;
    panel.style.transition = 'none';
  });

  panel.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    currentY = e.touches[0].clientY;
    const dy = currentY - startY;
    if (dy > 0) panel.style.transform = 'translateY(' + dy + 'px)';
  });

  panel.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    panel.style.transition = '';
    panel.style.transform = '';
    const dy = currentY - startY;
    if (dy > 100) closeInfoPanel();
  });
}

/* ─── Tap-to-place nodes from palette (mobile) ─── */
function setupMobilePalette() {
  document.querySelectorAll('.palette-item').forEach(item => {
    item.addEventListener('touchend', (e) => {
      const type = item.getAttribute('data-type');
      if (!type) return;
      // Place at center of visible canvas
      const cvs = document.getElementById('networkCanvas');
      if (!cvs) return;
      const rect = cvs.getBoundingClientRect();
      const cx = viewportX + (rect.width / 2) / zoomLevel;
      const cy = viewportY + (rect.height / 2) / zoomLevel;
      createNode(type, cx + (Math.random() - 0.5) * 60, cy + (Math.random() - 0.5) * 60);
      closeSidebar();
      addLog('info', 'Nouveau nœud placé au centre');
    });
  });
}

/* ─── Detect mobile ─── */
function isMobile() {
  return window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1024);
}

/* ─── Initialize mobile features ─── */
function initMobile() {
  if (!isMobile() && !('ontouchstart' in window)) return;
  setupCanvasTouch();
  setupBottomSheet();
  setupMobilePalette();
  document.body.classList.add('touch-device');
}
