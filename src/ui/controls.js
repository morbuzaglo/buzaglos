// Touch joystick + A/B buttons + keyboard fallback. Exposes a shared `input` object.
export const input = { x: 0, y: 0, a: false, b: false, aPressed: false, bPressed: false, enabled: true };
const handlers = { a: [], b: [] };
export const onPress = (btn, fn) => handlers[btn].push(fn);

export function setControlsVisible(v) { document.getElementById('controls').style.display = v ? '' : 'none'; }

export function initControls() {
  const stick = document.getElementById('stick'), knob = document.getElementById('knob');
  let id = null, cx = 0, cy = 0;
  const R = 44;
  const move = (e) => {
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const m = Math.hypot(dx, dy) / R;
    input.x = m < 0.18 ? 0 : dx / R; input.y = m < 0.18 ? 0 : dy / R;
  };
  stick.addEventListener('pointerdown', (e) => {
    e.preventDefault(); id = e.pointerId; stick.setPointerCapture(id);
    const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; move(e);
  });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === id) { e.preventDefault(); move(e); } });
  const end = (e) => { if (e.pointerId !== id) return; id = null; input.x = 0; input.y = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);

  const bindBtn = (el, key) => {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); input[key] = true; input[key + 'Pressed'] = true; el.classList.add('down'); handlers[key].forEach((f) => f()); });
    const up = (e) => { e.preventDefault(); input[key] = false; el.classList.remove('down'); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
  };
  bindBtn(document.getElementById('btnA'), 'a');
  bindBtn(document.getElementById('btnB'), 'b');

  // keyboard (desktop testing / iPad keyboards)
  const keys = new Set();
  const upd = () => {
    const l = keys.has('ArrowLeft') || keys.has('a'), r = keys.has('ArrowRight') || keys.has('d'), u = keys.has('ArrowUp') || keys.has('w'), dn = keys.has('ArrowDown') || keys.has('s');
    if (id === null) { input.x = (r ? 1 : 0) - (l ? 1 : 0); input.y = (dn ? 1 : 0) - (u ? 1 : 0); }
  };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (['z', ' ', 'Enter'].includes(e.key)) { input.a = true; input.aPressed = true; handlers.a.forEach((f) => f()); e.preventDefault(); }
    else if (['x', 'Shift'].includes(e.key)) { input.b = true; input.bPressed = true; handlers.b.forEach((f) => f()); }
    else { keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key); upd(); }
  });
  window.addEventListener('keyup', (e) => {
    if (['z', ' ', 'Enter'].includes(e.key)) input.a = false;
    else if (['x', 'Shift'].includes(e.key)) input.b = false;
    else { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); upd(); }
  });
  // iOS: block pinch/double-tap zoom and rubber-banding
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => { if (!e.target.closest('#panel .body')) e.preventDefault(); }, { passive: false });
  let last = 0;
  document.addEventListener('touchend', (e) => { const n = Date.now(); if (n - last < 350) e.preventDefault(); last = n; }, { passive: false });
}
