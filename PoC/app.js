/**
 * app.js
 * Точка входа: инициализация, цикл отрисовки, ввод, отладка.
 */

import {
  cv, ctx, statusEl, setSize, W, H, requestRender, consumeRenderFlag,
  state, VIEW, GUTTER, HEADER, anchorWeekStart, today, now,
  addDays, sameDay, dowMon0, dayIdx, clamp, fmtFull, bus, hover,
  counters, layout, DW, MF, MS,
  weekNumberOfMonday, rowWeekStart, buildWeekLabel, startOfWeekFDOW, monthRowGutterIdx, monthIdxToYM, monthrowDate
} from './core.js';
import { describe, getEventBounds, loadEvents } from './events.js';
import * as modeDays from './mode-days.js';
import * as modeHours from './mode-hours.js';
import * as modeMonths from './mode-months.js';
import * as navigation from './navigation.js';
import { initControls } from './controls.js';

// ---------- отладочный оверлей ----------
let debugOverlayEnabled = false;
let frameCount = 0, lastFpsTime = performance.now(), currentFps = 0;

function toggleDebugOverlay() {
  debugOverlayEnabled = !debugOverlayEnabled;
  const overlay = document.getElementById('debugOverlay');
  if (overlay) overlay.classList.toggle('visible', debugOverlayEnabled);
}

function updateDebugOverlay(renderTimeMs) {
  if (!debugOverlayEnabled) return;
  const nowPerf = performance.now();
  frameCount++;
  if (nowPerf - lastFpsTime >= 500) {
    currentFps = Math.round(frameCount * 1000 / (nowPerf - lastFpsTime));
    frameCount = 0;
    lastFpsTime = nowPerf;
    document.getElementById('dbgFps').textContent = currentFps;
  }
  const gutterOffset = (state.mode === 'timeline') ? 0 : GUTTER;
  const vpCenterX = state.camX + (W / 2 - gutterOffset) / VIEW.cellW;
  const vpCenterY = state.camY + (H / 2 - HEADER) / VIEW.rowH;
  document.getElementById('dbgVpX').textContent = vpCenterX.toFixed(2);
  document.getElementById('dbgVpY').textContent = vpCenterY.toFixed(2);
  document.getElementById('dbgCells').textContent = counters.cells;
  document.getElementById('dbgEvents').textContent = counters.events;
  document.getElementById('dbgRender').textContent = renderTimeMs.toFixed(1) + 'ms';
}

// ---------- hover ----------
function computeHover() {
  hover.hl = { dow: null, dowOrd: null, dateNum: null, weekNum: null, monthIdx: null, eventId: null,
               hoverDow: null, hoverWeekNum: null, hoverMonthIdx: null, hoverMonthWeekStart: null,
               hoverSeamLeft: null, hoverSeamRight: null };
  hover.region = null;
  hover.cell = null;
  hover.headerK = null;
  hover.gutterR = null;
  if (!state.mouse) { statusEl.textContent = ''; return; }
  const mx = state.mouse.x, my = state.mouse.y, lvl = VIEW;
  const L = layout(state.zoom);
  if (state.mode === 'map') {
    if (mx >= GUTTER && my >= HEADER) {
      hover.region = 'grid';
      const r = Math.floor(state.camY + (my - HEADER) / lvl.rowH);
      const k = Math.floor(state.camX + (mx - GUTTER) / lvl.cellW);
      hover.cell = { r, k };
      const date = addDays(anchorWeekStart, 7 * r + k);
      const ord = Math.floor((date.getDate() - 1) / 7) + 1;
      const dow = dowMon0(date);
      hover.hl.hoverDow = dow;
      hover.hl.hoverWeekNum = weekNumberOfMonday(startOfWeekFDOW(date));
      hover.hl.hoverMonthIdx = date.getFullYear() * 12 + date.getMonth();
      hover.hl.hoverMonthWeekStart = startOfWeekFDOW(date);
      let cellDow;
      if (state.firstDayOfWeek === 'sun') cellDow = date.getDay();
      else cellDow = dowMon0(date);
      const daysToSeamRight = (6 - cellDow + 7) % 7;
      const rightSeamCol = k + daysToSeamRight;
      const leftCol = rightSeamCol - 6;
      hover.hl.hoverSeamLeft = leftCol;
      hover.hl.hoverSeamRight = rightSeamCol;
      const bars = modeDays.computeRowBars(r);
      let hb = null;
      for (const b of bars) { if (mx >= b.x0 && mx <= b.x1 && my >= b.y0 && my <= b.y1) { hb = b; break; } }
      if (hb) {
        hover.hl.eventId = hb.e.id;
        statusEl.textContent = hb.e.title + ' · ' + describe(hb.e) + ' · план: ' + hb.e.plan;
      } else {
        const x = GUTTER + (k - state.camX) * lvl.cellW;
        const y = HEADER + (r - state.camY) * lvl.rowH;
        if (mx >= x + 4 && mx <= x + 100 && my >= y + L.ordY - 14 * L.cs && my <= y + L.ordY + 5 * L.cs) {
          hover.hl.dowOrd = { ord, dow };
          statusEl.textContent = 'Все ' + ord + '-е ' + DW[dow] + ' месяца';
        } else if (mx >= x + 4 && mx <= x + 60 && my >= y + L.dateY - 22 * L.cs && my <= y + L.dateY + 5 * L.cs) {
          hover.hl.dateNum = date.getDate();
          statusEl.textContent = 'Все ' + date.getDate() + '-е числа';
        } else {
          statusEl.textContent = fmtFull(date);
        }
      }
    } else if (mx >= GUTTER && my < HEADER) {
      hover.region = 'header';
      const k = Math.floor(state.camX + (mx - GUTTER) / lvl.cellW);
      hover.headerK = k;
      const dow = ((k % 7) + 7) % 7;
      hover.hl.dow = dow;
      statusEl.textContent = 'День недели: ' + DW[dow] + ' — подсвечены все ' + DW[dow];
    } else if (mx < GUTTER && my >= HEADER) {
      hover.region = 'gutter';
      const r = Math.floor(state.camY + (my - HEADER) / lvl.rowH);
      hover.gutterR = r;
      const wm = rowWeekStart(r);
      hover.hl.weekNum = weekNumberOfMonday(wm);
      const lbl = buildWeekLabel(wm);
      statusEl.textContent = lbl.line1 + ' · ' + lbl.line2;
    } else { statusEl.textContent = ''; }
  } else if (state.mode === 'timeline') {
    if (mx >= 0 && my >= (H - VIEW.rowH) / 2 && my <= (H + VIEW.rowH) / 2) {
      hover.region = 'grid';
      const k = Math.floor(state.camX + mx / lvl.cellW);
      hover.cell = { r: state.activeRow, k };
      const bars = modeHours.computeTimelineBars();
      let hb = null;
      for (const b of bars) { if (mx >= b.x0 && mx <= b.x1 && my >= b.y0 && my <= b.y1) { hb = b; break; } }
      if (hb) {
        hover.hl.eventId = hb.e.id;
        statusEl.textContent = hb.e.title + ' · ' + describe(hb.e) + ' · план: ' + hb.e.plan;
      } else {
        const date = addDays(anchorWeekStart, 7 * state.activeRow + k);
        statusEl.textContent = fmtFull(date);
      }
    } else { hover.cell = null; statusEl.textContent = ''; }
  } else if (state.mode === 'monthrow') {
    if (mx >= GUTTER && my >= HEADER) {
      hover.region = 'grid';
      const r = Math.floor(state.camY + (my - HEADER) / lvl.rowH);
      const k = Math.floor(state.camX + (mx - GUTTER) / lvl.cellW);
      hover.cell = { r, k };
      const date = monthrowDate(r, k);
      const x = GUTTER + (k - state.camX) * lvl.cellW;
      const y = HEADER + (r - state.camY) * lvl.rowH;
      hover.hl.hoverDow = dowMon0(date);
      hover.hl.hoverMonthIdx = date.getFullYear() * 12 + date.getMonth();
      hover.hl.hoverMonthWeekStart = startOfWeekFDOW(date);
      const bars = modeMonths.computeMonthRowBars(r);
      let hb = null;
      for (const b of bars) { if (mx >= b.x0 && mx <= b.x1 && my >= b.y0 && my <= b.y1) { hb = b; break; } }
      if (hb) {
        hover.hl.eventId = hb.e.id;
        statusEl.textContent = hb.e.title + ' · ' + describe(hb.e) + ' · план: ' + hb.e.plan;
      } else if (mx >= x + 4 && mx <= x + 22 && my >= y + lvl.rowH * 0.6 - 9 && my <= y + lvl.rowH * 0.6 + 1) {
        hover.hl.dateNum = date.getDate();
        statusEl.textContent = 'Все ' + date.getDate() + '-е числа';
      } else {
        statusEl.textContent = fmtFull(date);
      }
    } else if (mx >= GUTTER && my < HEADER) {
      hover.region = 'header';
      const k = Math.floor(state.camX + (mx - GUTTER) / lvl.cellW);
      hover.headerK = k;
      const dow = (((k + 6) % 7) + 7) % 7;
      hover.hl.dow = dow;
      statusEl.textContent = 'День недели: ' + DW[dow] + ' — подсвечены все ' + DW[dow];
    } else if (mx < GUTTER && my >= HEADER) {
      hover.region = 'gutter';
      const r = Math.floor(state.camY + (my - HEADER) / lvl.rowH);
      hover.gutterR = r;
      hover.hl.monthIdx = monthRowGutterIdx(r);
      const ym2 = monthIdxToYM(hover.hl.monthIdx);
      statusEl.textContent = MF[ym2.m] + ' ' + ym2.y + ' — подсвечены все числа месяца';
    } else { statusEl.textContent = ''; }
  }
}

// ---------- рендер ----------
function render() {
  if (state.mode === 'timeline') modeHours.renderTimeline();
  else if (state.mode === 'monthrow') modeMonths.renderMonthRow();
  else modeDays.renderMap();
}

function loop() {
  if (navigation.transition) requestRender();
  if (consumeRenderFlag()) {
    const renderStart = performance.now();
    computeHover();
    render();
    const renderTime = performance.now() - renderStart;
    updateDebugOverlay(renderTime);
  }
  if (navigation.transition && navigation.snapshotCanvas) {
    navigation.updateTransition();
  }
  requestAnimationFrame(loop);
}

// ---------- ввод ----------
let drag = null;

function handleZoomWheel(dy, mx, my) {
  if (navigation.transition) return;
  const factor = clamp(Math.pow(1.0015, -dy), 0.5, 2);
  const zoomIn = factor > 1;
  if (state.mode === 'map') {
    if (zoomIn) {
      if (state.zoom < 10) { navigation.zoomAt(mx, my, factor); state.barrier = 0; }
      else { state.barrier++; if (state.barrier >= 3) navigation.startTransitionToTimeline(); }
    } else {
      if (state.zoom > 0.5) { navigation.zoomAt(mx, my, factor); state.barrier = 0; }
      else { state.barrier++; if (state.barrier >= 3) navigation.startTransitionToMonthRow(); }
    }
  } else if (state.mode === 'timeline') {
    if (zoomIn) {
      if (state.zoom < 25) { navigation.zoomAt(mx, my, factor); state.barrier = 0; }
    } else {
      if (state.zoom > 10) { navigation.zoomAt(mx, my, factor); state.barrier = 0; }
      else { state.barrier++; if (state.barrier >= 3) navigation.startTransitionToMap(); }
    }
  } else if (state.mode === 'monthrow') {
    if (zoomIn) {
      if (state.zoom < 0.5) { navigation.zoomAt(mx, my, factor); state.barrier = 0; }
      else { state.barrier++; if (state.barrier >= 3) navigation.startTransitionToMap(); }
    } else {
      if (state.zoom > 0.25) { navigation.zoomAt(mx, my, factor); state.barrier = 0; }
    }
  }
  requestRender();
}

function onResize() {
  const d = window.devicePixelRatio || 1;
  setSize(window.innerWidth, window.innerHeight);
  cv.width = W * d; cv.height = H * d;
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  ctx.setTransform(d, 0, 0, d, 0, 0);
  bus.emit('applyZoom');
  requestRender();
}

function initInput() {
  cv.addEventListener('mousedown', e => { drag = { x: e.clientX, y: e.clientY, camX: state.camX, camY: state.camY }; cv.classList.add('drag'); });
  window.addEventListener('mousemove', e => {
    state.mouse = { x: e.clientX, y: e.clientY };
    if (drag && !navigation.transition) {
      state.camX = drag.camX - (e.clientX - drag.x) / VIEW.cellW;
      if (state.mode !== 'timeline') state.camY = drag.camY - (e.clientY - drag.y) / VIEW.rowH;
    }
    requestRender();
  });
  window.addEventListener('mouseup', () => { drag = null; cv.classList.remove('drag'); });
  cv.addEventListener('dblclick', () => { bus.emit('centerDate', today); });

  window.addEventListener('wheel', e => {
    if (e.target.closest && e.target.closest('#hud,#zoom-controls,#debugOverlay')) return;
    e.preventDefault();
    const mx = e.clientX, my = e.clientY;
    if (e.ctrlKey) {
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 33; else if (e.deltaMode === 2) dy *= 100;
      if (state.mode !== 'timeline') state.camY += dy / VIEW.rowH;
      requestRender();
      return;
    }
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      state.camX += dx / VIEW.cellW;
      requestRender();
      return;
    }
    if (mx < GUTTER && my >= HEADER) {
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 33; else if (e.deltaMode === 2) dy *= 100;
      if (state.mode !== 'timeline') state.camY += dy / VIEW.rowH;
      requestRender();
      return;
    }
    if (my < HEADER && mx >= GUTTER) {
      let dx = e.deltaX;
      if (e.deltaMode === 1) dx *= 33; else if (e.deltaMode === 2) dx *= 100;
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) dx = e.deltaY;
      state.camX += dx / VIEW.cellW;
      requestRender();
      return;
    }
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 33; else if (e.deltaMode === 2) dy *= 100;
    handleZoomWheel(dy, mx, my);
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (e.key === '0') { bus.emit('centerDate', today); }
    else if (e.key === 'ArrowLeft') { state.camX -= 1; requestRender(); }
    else if (e.key === 'ArrowRight') { state.camX += 1; requestRender(); }
    else if (e.key === 'ArrowUp' && state.mode !== 'timeline') { state.camY -= 0.2; requestRender(); }
    else if (e.key === 'ArrowDown' && state.mode !== 'timeline') { state.camY += 0.2; requestRender(); }
    else if (e.key === 'F2') { toggleDebugOverlay(); }
  });

  window.addEventListener('resize', onResize);
}

// ---------- запуск ----------
async function init() {
  await loadEvents();
  onResize();
  navigation.initNavigation();
  initControls();
  initInput();
  navigation.applyZoom();
  bus.on('requestRender', () => requestRender());
  bus.emit('goNow');
  requestAnimationFrame(loop);
}

init();
