/**
 * navigation.js
 * Навигация, масштабирование и переходы между режимами (кросс-фейд).
 */

import {
  cv, ctx, state, VIEW, W, H, GUTTER, HEADER, BASE, ZMIN_MAP, ZMAX_MAP, ZMIN_TL, ZMAX_TL,
  ZMIN_MR, ZMAX_MR, BARRIER, anchorWeekStart, today, now,
  addDays, dayIdx, dowMon0, startOfWeekFDOW, clamp, bus, requestRender, monthBaseDate, monthIdxToYM
} from './core.js';

// ---------- масштаб и вид ----------
export function applyZoom() {
  const Z = state.zoom;
  if (state.mode === 'timeline') {
    VIEW.cellW = BASE * Z;
    VIEW.rowH = H * 0.75;
  } else if (state.mode === 'monthrow') {
    VIEW.cellW = BASE * Z;
    VIEW.rowH = BASE * 0.5;
  } else {
    VIEW.cellW = BASE * Z;
    VIEW.rowH = Z >= 1 ? BASE * (1 + (Z - 1) / 30) : BASE * Z;
  }
  bus.emit('zoomUpdated', state.zoom);
  bus.emit('modeChanged', state.mode);
  syncSlider();
}

export function getZoomSteps() {
  if (state.mode === 'map') return [0.5, 1, 1.25, 1.5, 1.75, 2, 3, 5, 10];
  if (state.mode === 'timeline') return [10, 12.5, 15, 20, 25];
  if (state.mode === 'monthrow') return [0.25, 0.35, 0.5];
  return [1];
}

export function zoomAt(mx, my, factor) {
  const oldCW = VIEW.cellW, oldRH = VIEW.rowH;
  const gutterOffset = (state.mode === 'timeline') ? 0 : GUTTER;
  const k = state.camX + (mx - gutterOffset) / oldCW;
  const r = state.camY + (my - HEADER) / oldRH;
  let newZoom;
  if (state.mode === 'map') newZoom = clamp(state.zoom * factor, ZMIN_MAP, ZMAX_MAP);
  else if (state.mode === 'timeline') newZoom = clamp(state.zoom * factor, ZMIN_TL, ZMAX_TL);
  else newZoom = clamp(state.zoom * factor, ZMIN_MR, ZMAX_MR);
  state.zoom = newZoom;
  applyZoom();
  state.camX = k - (mx - gutterOffset) / VIEW.cellW;
  state.camY = r - (my - HEADER) / VIEW.rowH;
  syncSlider();
  requestRender();
}

export function setZoomTo(z) {
  const oldCW = VIEW.cellW, oldRH = VIEW.rowH;
  const gutterOffset = (state.mode === 'timeline') ? 0 : GUTTER;
  const k = state.camX + (W / 2 - gutterOffset) / oldCW;
  const r = state.camY + (H / 2 - HEADER) / oldRH;
  state.zoom = z;
  applyZoom();
  state.camX = k - (W / 2 - gutterOffset) / VIEW.cellW;
  state.camY = r - (H / 2 - HEADER) / VIEW.rowH;
  syncSlider();
  requestRender();
}

export function zoomStep(direction) {
  const steps = getZoomSteps();
  const cur = state.zoom;
  let target = null;
  if (direction > 0) { for (const s of steps) { if (s > cur + 0.001) { target = s; break; } } }
  else { for (let i = steps.length - 1; i >= 0; i--) { if (steps[i] < cur - 0.001) { target = steps[i]; break; } } }
  if (target !== null) setZoomTo(target);
}

export function resetZoom() {
  const oldCW = VIEW.cellW, oldRH = VIEW.rowH;
  const gutterOffset = (state.mode === 'timeline') ? 0 : GUTTER;
  const k = state.camX + (W / 2 - gutterOffset) / oldCW;
  const r = state.camY + (H / 2 - HEADER) / oldRH;
  if (state.mode === 'map') state.zoom = 1;
  else if (state.mode === 'timeline') state.zoom = ZMIN_TL;
  else state.zoom = ZMAX_MR;
  state.barrier = 0;
  applyZoom();
  state.camX = k - (W / 2 - gutterOffset) / VIEW.cellW;
  state.camY = r - (H / 2 - HEADER) / VIEW.rowH;
  requestRender();
}

export function zoomToSlider(z) {
  if (z <= 0.5) { return 100 * Math.log(z / 0.25) / Math.log(0.5 / 0.25); }
  if (z <= 10) { return 100 + 100 * Math.log(z / 0.5) / Math.log(10 / 0.5); }
  return 200 + 100 * Math.log(z / 10) / Math.log(25 / 10);
}

export function sliderToZoom(v) {
  if (v <= 100) { return 0.25 * Math.pow(0.5 / 0.25, v / 100); }
  if (v <= 200) { return 0.5 * Math.pow(10 / 0.5, (v - 100) / 100); }
  return 10 * Math.pow(25 / 10, (v - 200) / 100);
}

let sliderLock = false;
export function syncSlider() {
  const sl = document.getElementById('zoomSlider');
  if (!sl) return;
  sliderLock = true;
  sl.value = zoomToSlider(state.zoom);
  sliderLock = false;
}
export function isSliderLocked() { return sliderLock; }

export function setZoomFromSlider(raw) {
  const z = sliderToZoom(raw);
  const target = z < 0.5 ? 'monthrow' : (z <= 10 ? 'map' : 'timeline');
  if (target !== state.mode) changeModeInstant(target);
  const oldCW = VIEW.cellW, oldRH = VIEW.rowH;
  const gutterOffset = (state.mode === 'timeline') ? 0 : GUTTER;
  const k = state.camX + (W / 2 - gutterOffset) / oldCW;
  const r = state.camY + (H / 2 - HEADER) / oldRH;
  let zc = z;
  if (state.mode === 'map') zc = clamp(z, ZMIN_MAP, ZMAX_MAP);
  else if (state.mode === 'timeline') zc = clamp(z, ZMIN_TL, ZMAX_TL);
  else zc = clamp(z, ZMIN_MR, ZMAX_MR);
  state.zoom = zc;
  applyZoom();
  state.camX = k - (W / 2 - gutterOffset) / VIEW.cellW;
  state.camY = r - (H / 2 - HEADER) / VIEW.rowH;
  syncSlider();
  requestRender();
}

export function zoomDbl(direction) {
  if (state.mode === 'map' && direction > 0 && state.zoom >= 10 - 0.001) { startTransitionToTimeline(); return; }
  if (state.mode === 'map' && direction < 0 && state.zoom <= 0.5 + 0.001) { startTransitionToMonthRow(); return; }
  if (state.mode === 'timeline' && direction < 0 && state.zoom <= 10 + 0.001) { startTransitionToMap(); return; }
  if (state.mode === 'monthrow' && direction > 0 && state.zoom >= 0.5 - 0.001) { startTransitionToMap(); return; }
}

// ---------- смена режима ----------
export function changeModeInstant(target) {
  if (target === state.mode) return;
  const mx = W / 2, my = H / 2;
  const oldCW = VIEW.cellW, oldRH = VIEW.rowH;
  if (state.mode === 'map' && target === 'timeline') {
    const r = Math.floor(state.camY + (my - HEADER) / oldRH);
    state.activeRow = r;
    state.saved = { camX: state.camX, camY: state.camY, zoom: state.zoom };
    const p = state.camX + (mx - GUTTER) / oldCW;
    state.mode = 'timeline';
    applyZoom();
    state.camX = p - mx / VIEW.cellW;
  } else if (state.mode === 'timeline' && target === 'map') {
    const p = state.camX + mx / oldCW;
    state.mode = 'map';
    if (state.saved) { state.camY = state.saved.camY; state.zoom = state.saved.zoom; }
    applyZoom();
    state.camX = p - (mx - GUTTER) / VIEW.cellW;
  } else if (state.mode === 'map' && target === 'monthrow') {
    const kMap = state.camX + (mx - GUTTER) / oldCW;
    const rMap = state.camY + (my - HEADER) / oldRH;
    const r = Math.floor(rMap), k = Math.floor(kMap);
    const fracX = kMap - k, fracY = rMap - r;
    const date = addDays(anchorWeekStart, 7 * r + k);
    state.orientMonth = { y: date.getFullYear(), m: date.getMonth() };
    state.saved = { camX: state.camX, camY: state.camY, zoom: state.zoom };
    state.mode = 'monthrow';
    applyZoom();
    const base = monthBaseDate(date.getFullYear(), date.getMonth());
    const k_mr = dayIdx(date) - dayIdx(base);
    state.camX = k_mr + fracX - (mx - GUTTER) / VIEW.cellW;
    state.camY = 0 + fracY - (my - HEADER) / VIEW.rowH;
  } else if (state.mode === 'monthrow' && target === 'map') {
    const kMr = state.camX + (mx - GUTTER) / oldCW;
    const rMr = state.camY + (my - HEADER) / oldRH;
    const rI = Math.floor(rMr), kI = Math.floor(kMr);
    const fracX = kMr - kI, fracY = rMr - rI;
    const orientIdx = state.orientMonth ? state.orientMonth.y * 12 + state.orientMonth.m : today.getFullYear() * 12 + today.getMonth();
    const mi = orientIdx + rI;
    const ym = monthIdxToYM(mi);
    const base = monthBaseDate(ym.y, ym.m);
    const dateUnderCursor = addDays(base, kI);
    state.mode = 'map';
    state.zoom = ZMIN_MAP;
    applyZoom();
    const dAbs = dayIdx(dateUnderCursor) - dayIdx(anchorWeekStart);
    const rMap = Math.floor(dAbs / 7), kMap = dAbs - 7 * rMap;
    state.camX = kMap + fracX - (mx - GUTTER) / VIEW.cellW;
    state.camY = rMap + fracY - (my - HEADER) / VIEW.rowH;
  }
  state.barrier = 0;
  requestRender();
}

// ---------- переходы (кросс-фейд) ----------
export let transition = null;
export let snapshotCanvas = null;
const EASE = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function captureSnapshot() {
  snapshotCanvas = document.createElement('canvas');
  snapshotCanvas.width = cv.width;
  snapshotCanvas.height = cv.height;
  snapshotCanvas.getContext('2d').drawImage(cv, 0, 0);
}

export function startTransitionToTimeline() {
  captureSnapshot();
  const mx = state.mouse ? state.mouse.x : W / 2;
  const my = state.mouse ? state.mouse.y : H / 2;
  const r = Math.floor(state.camY + (my - HEADER) / VIEW.rowH);
  state.activeRow = r;
  state.saved = { camX: state.camX, camY: state.camY, zoom: state.zoom };
  const pointUnderCursor = state.camX + (mx - GUTTER) / VIEW.cellW;
  state.mode = 'timeline';
  state.zoom = ZMIN_TL;
  state.barrier = 0;
  applyZoom();
  state.camX = pointUnderCursor - mx / VIEW.cellW;
  transition = { start: performance.now(), duration: 400 };
  requestRender();
}

export function startTransitionToMonthRow() {
  captureSnapshot();
  const mx = state.mouse ? state.mouse.x : W / 2;
  const my = state.mouse ? state.mouse.y : H / 2;
  const kMap = state.camX + (mx - GUTTER) / VIEW.cellW;
  const rMap = state.camY + (my - HEADER) / VIEW.rowH;
  const r = Math.floor(rMap), k = Math.floor(kMap);
  const fracX = kMap - k, fracY = rMap - r;
  const date = addDays(anchorWeekStart, 7 * r + k);
  state.orientMonth = { y: date.getFullYear(), m: date.getMonth() };
  state.saved = { camX: state.camX, camY: state.camY, zoom: state.zoom };
  state.mode = 'monthrow';
  state.zoom = ZMAX_MR;
  state.barrier = 0;
  applyZoom();
  const base = monthBaseDate(date.getFullYear(), date.getMonth());
  const k_mr = dayIdx(date) - dayIdx(base);
  state.camX = k_mr + fracX - (mx - GUTTER) / VIEW.cellW;
  state.camY = 0 + fracY - (my - HEADER) / VIEW.rowH;
  transition = { start: performance.now(), duration: 400 };
  requestRender();
}

export function startTransitionToMap() {
  captureSnapshot();
  const prevMode = state.mode;
  const mx = state.mouse ? state.mouse.x : W / 2;
  const my = state.mouse ? state.mouse.y : H / 2;
  if (prevMode === 'timeline') {
    const oldCW = VIEW.cellW;
    const k = Math.floor(state.camX + mx / oldCW);
    const dateUnderCursor = addDays(anchorWeekStart, 7 * state.activeRow + k);
    const fracX = (state.camX + mx / oldCW) - k;
    state.mode = 'map';
    if (state.saved) state.zoom = state.saved.zoom;
    applyZoom();
    const dAbs = dayIdx(dateUnderCursor) - dayIdx(anchorWeekStart);
    const rMap = Math.floor(dAbs / 7), kMap = dAbs - 7 * rMap;
    state.camX = kMap + fracX - (mx - GUTTER) / VIEW.cellW;
    state.camY = rMap + fracX - (my - HEADER) / VIEW.rowH;
  } else {
    const kMr = state.camX + (mx - GUTTER) / VIEW.cellW;
    const rMr = state.camY + (my - HEADER) / VIEW.rowH;
    const rI = Math.floor(rMr), kI = Math.floor(kMr);
    const fracX = kMr - kI, fracY = rMr - rI;
    const orientIdx = state.orientMonth ? state.orientMonth.y * 12 + state.orientMonth.m : today.getFullYear() * 12 + today.getMonth();
    const mi = orientIdx + rI;
    const ym = monthIdxToYM(mi);
    const base = monthBaseDate(ym.y, ym.m);
    const dateUnderCursor = addDays(base, kI);
    state.mode = 'map';
    state.zoom = ZMIN_MAP;
    applyZoom();
    const dAbs = dayIdx(dateUnderCursor) - dayIdx(anchorWeekStart);
    const rMap = Math.floor(dAbs / 7);
    const kMap = dAbs - 7 * rMap;
    state.camX = kMap + fracX - (mx - GUTTER) / VIEW.cellW;
    state.camY = rMap + fracY - (my - HEADER) / VIEW.rowH;
  }
  state.barrier = 0;
  transition = { start: performance.now(), duration: 400 };
  requestRender();
}

export function updateTransition() {
  if (!transition || !snapshotCanvas) return false;
  const elapsed = performance.now() - transition.start;
  const t = Math.min(elapsed / transition.duration, 1);
  const alpha = 1 - EASE(t);
  if (alpha > 0.01) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.drawImage(snapshotCanvas, 0, 0);
    ctx.restore();
  }
  if (t >= 1) { transition = null; snapshotCanvas = null; }
  return true;
}

// ---------- навигация по датам ----------
export function goNow() {
  if (state.mode === 'map') {
    const cw = VIEW.cellW, ch = VIEW.rowH;
    const gridW = W - GUTTER, gridH = H - HEADER;
    const t = clamp((state.zoom - 1.25) / 0.5, 0, 1);
    const y = today.getFullYear(), m = today.getMonth();
    const week1Monday = startOfWeekFDOW(new Date(y, m, 1));
    const fridayW3 = addDays(week1Monday, 18);
    const dA = dayIdx(fridayW3) - dayIdx(anchorWeekStart);
    const rA = Math.floor(dA / 7), kA = dA - 7 * rA;
    const camXA = kA + 0.5 - gridW / (2 * cw), camYA = rA + 0.5 - gridH / (2 * ch);
    const nowFrac = (now.getHours() * 60 + now.getMinutes()) / 1440;
    const camXB = dowMon0(today) + nowFrac - gridW / (2 * cw);
    const camYB = 0.5 - gridH / (3 * ch);
    state.camX = camXA + (camXB - camXA) * t;
    state.camY = camYA + (camYB - camYA) * t;
  } else if (state.mode === 'timeline') {
    const todayDayIdx = dayIdx(today);
    const activeRowStart = dayIdx(addDays(anchorWeekStart, 7 * state.activeRow));
    if (todayDayIdx < activeRowStart || todayDayIdx >= activeRowStart + 7) {
      state.activeRow = Math.floor((todayDayIdx - dayIdx(anchorWeekStart)) / 7);
    }
    const kToday = todayDayIdx - dayIdx(addDays(anchorWeekStart, 7 * state.activeRow));
    const nowFrac = (now.getHours() * 60 + now.getMinutes()) / 1440;
    state.camX = kToday + nowFrac - W / (2 * VIEW.cellW);
  } else if (state.mode === 'monthrow') {
    state.orientMonth = { y: today.getFullYear(), m: today.getMonth() };
    const base = monthBaseDate(today.getFullYear(), today.getMonth());
    const k_mr = dayIdx(today) - dayIdx(base) + (now.getHours() * 60 + now.getMinutes()) / 1440;
    state.camX = k_mr - W / (2 * VIEW.cellW);
    state.camY = 0.5 - (H - HEADER) / (2 * VIEW.rowH);
  }
  requestRender();
}

export function centerOnDate(date) {
  if (state.mode === 'map') {
    const cw = VIEW.cellW, ch = VIEW.rowH;
    const gridW = W - GUTTER, gridH = H - HEADER;
    const dAbs = dayIdx(date) - dayIdx(anchorWeekStart);
    const r = Math.floor(dAbs / 7), k = dAbs - 7 * r;
    state.camX = k + 0.5 - gridW / (2 * cw);
    state.camY = r + 0.5 - gridH / (2 * ch);
  } else if (state.mode === 'timeline') {
    const dAbs = dayIdx(date) - dayIdx(anchorWeekStart);
    state.activeRow = Math.floor(dAbs / 7);
    const k = dAbs - 7 * state.activeRow;
    state.camX = (k + 0.5) - W / (2 * VIEW.cellW);
  } else if (state.mode === 'monthrow') {
    state.orientMonth = { y: date.getFullYear(), m: date.getMonth() };
    const base = monthBaseDate(date.getFullYear(), date.getMonth());
    const k_mr = dayIdx(date) - dayIdx(base) + 0.5;
    state.camX = k_mr - W / (2 * VIEW.cellW);
    state.camY = 0.5 - (H - HEADER) / (2 * VIEW.rowH);
  }
  requestRender();
}

// ---------- инициализация ----------
export function initNavigation() {
  bus.on('goNow', () => goNow());
  bus.on('centerDate', (date) => centerOnDate(date));
  bus.on('resetZoom', () => resetZoom());
  bus.on('zoomStep', (dir) => zoomStep(dir));
  bus.on('zoomDbl', (dir) => zoomDbl(dir));
  bus.on('setZoomFromSlider', (z) => setZoomFromSlider(z));
  bus.on('applyZoom', () => applyZoom());
}
