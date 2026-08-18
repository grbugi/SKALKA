/**
 * core.js
 * Общее ядро PoC: константы, состояние, календарные утилиты,
 * диспетчер событий и вспомогательные функции отрисовки.
 */

// ---------- DOM ----------
export const cv = document.getElementById('cv');
export const ctx = cv.getContext('2d');
export const statusEl = document.getElementById('status');

let W = 0;
let H = 0;
export { W, H };

export function setSize(w, h) {
  W = w;
  H = h;
}

// ---------- чтение CSS-переменных ----------
const cssStyle = getComputedStyle(document.documentElement);
const cssColor = (name) => cssStyle.getPropertyValue(name).trim();
export const rgbaOf = (rgb, a) => `rgba(${rgb},${a})`;

export const PAL = {
  bg: cssColor('--bg'),
  chrome: cssColor('--chrome'),
  cellBg: cssColor('--cell-bg'),
  cellBgToday: cssColor('--cell-bg-today'),
  cellBgFirst: cssColor('--cell-bg-first'),
  border: cssColor('--border'),
  gridLine: cssColor('--grid-line'),
  timeLabelBg: cssColor('--time-label-bg'),
  text: cssColor('--text'),
  textSoft: cssColor('--text-soft'),
  textDim: cssColor('--text-dim'),
  textFaint: cssColor('--text-faint'),
  textCell: cssColor('--text-cell'),
  textWeekend: cssColor('--text-weekend'),
  textDaynum: cssColor('--text-daynum'),
  textDaynumToday: cssColor('--text-daynum-today'),
  accent: cssColor('--accent'),
  seamLine: cssColor('--seam-line'),
  monthFrame: cssColor('--month-frame'),
  hlHeaderHover: cssColor('--hl-header-hover'),
  hlGutterHover: cssColor('--hl-gutter-hover'),
  hlHoverDow: cssColor('--hl-hover-dow'),
  hlDow: cssColor('--hl-dow'),
  hlHeaderDow: cssColor('--hl-header-dow'),
  hlHoverRow: cssColor('--hl-hover-row'),
  hlWeekMonth: cssColor('--hl-week-month'),
  hlGutterWeek: cssColor('--hl-gutter-week'),
  hlDate: cssColor('--hl-date'),
  hlDateStrong: cssColor('--hl-date-strong'),
  hlOrd: cssColor('--hl-ord'),
  hlOrdStrong: cssColor('--hl-ord-strong'),
  silhouetteMonth: cssColor('--silhouette-month'),
  hlMonthrowRow: cssColor('--hl-monthrow-row'),
  hlMonthrowWeek: cssColor('--hl-monthrow-week'),
  nowLine: cssColor('--now-line'),
  nowLabel: cssColor('--now-label'),
  cellBorderToday: cssColor('--cell-border-today'),
  monthLabelOdd: cssColor('--month-label-odd'),
  monthLabelEven: cssColor('--month-label-even'),
  gradientOddRgb: cssColor('--gradient-odd-rgb'),
  gradientEvenRgb: cssColor('--gradient-even-rgb'),
  whiteRgb: cssColor('--white-rgb'),
  white: cssColor('--white'),
  eventBkp: cssColor('--event-bkp'),
  eventScan: cssColor('--event-scan'),
  eventLogs: cssColor('--event-logs'),
  eventRedis: cssColor('--event-redis'),
  eventSync: cssColor('--event-sync'),
  eventSunmon: cssColor('--event-sunmon'),
  eventFrisun: cssColor('--event-frisun'),
};

// ---------- календарь ----------
export const DAYMS = 86400000;
export const EPOCH = new Date(1970, 0, 1);

export const MF = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
export const MG = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
export const MS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
export const DW = ['пн','вт','ср','чт','пт','сб','вс'];
export const DWU = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'];
export const ORD_END = ['й','й','я','й','я','я','е'];

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const pad2 = (n) => String(n).padStart(2, '0');
export const mm = (min) => pad2(Math.floor(min / 60)) + ':' + pad2(min % 60);
export const dowMon0 = (d) => (d.getDay() + 6) % 7;
export const dayIdx = (d) => Math.round((d.getTime() - EPOCH.getTime()) / DAYMS);
export const dateFromDayIdx = (i) => new Date(1970, 0, 1 + i);
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export const startOfWeek = (d) => addDays(d, -dowMon0(d));
export const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
export const fmtD = (d) => d.getDate() + ' ' + MS[d.getMonth()];
export const fmtFull = (d) => `${DW[dowMon0(d)]}, ${d.getDate()} ${MF[d.getMonth()]} ${d.getFullYear()}`;

export function startOfWeekFDOW(d) {
  if (state.firstDayOfWeek === 'sun') { return addDays(d, -d.getDay()); }
  return addDays(d, -dowMon0(d));
}
export function monthBaseDate(y, m) {
  const firstDay = new Date(y, m, 1);
  const fdow = dowMon0(firstDay);
  if (state.firstDayOfWeek === 'sun') { return addDays(firstDay, -((fdow + 1) % 7)); }
  return addDays(firstDay, 6 - fdow);
}
export function monthIdxToYM(idx) {
  let y = Math.floor(idx / 12), m = idx % 12;
  if (m < 0) { m += 12; y--; }
  return { y, m };
}
export function weekNumOfMonth(weekStart, y, m) {
  const w1 = startOfWeekFDOW(new Date(y, m, 1));
  return Math.round((weekStart - w1) / (7 * DAYMS)) + 1;
}
const weekNumCache = new Map();
export function weekNumberOfMonday(wm) {
  const key = wm.getTime();
  if (weekNumCache.has(key)) return weekNumCache.get(key);
  const th = addDays(wm, 3), m = th.getMonth(), y = th.getFullYear();
  const wn = weekNumOfMonth(wm, y, m);
  weekNumCache.set(key, wn);
  return wn;
}
export function buildWeekLabel(wm) {
  const sun = addDays(wm, 6);
  const rangeStr = fmtD(wm) + ' – ' + fmtD(sun);
  const m1 = wm.getMonth(), y1 = wm.getFullYear(), m2 = sun.getMonth(), y2 = sun.getFullYear();
  let line1;
  if (m1 === m2 && y1 === y2) { line1 = weekNumOfMonth(wm, y1, m1) + ' неделя ' + MG[m1]; }
  else { line1 = weekNumOfMonth(wm, y1, m1) + ' нед ' + MS[m1] + ' / ' + weekNumOfMonth(wm, y2, m2) + ' нед ' + MS[m2]; }
  return { line1, line2: rangeStr };
}

// ---------- геометрия и состояние ----------
export const GUTTER = 200;
export const HEADER = 42;
export const BASE = 150;
export const ZMIN_MAP = 0.5, ZMAX_MAP = 10.0;
export const ZMIN_TL = 10.0, ZMAX_TL = 25.0;
export const ZMIN_MR = 0.25, ZMAX_MR = 0.5;
export const BARRIER = 3;
export const VIEW = { cellW: BASE, rowH: BASE };

export const state = {
  camX: 0, camY: 0, mouse: null, zoom: 1, mode: 'map',
  barrier: 0, activeRow: 0, saved: null, orientMonth: null,
  firstDayOfWeek: 'mon',
};

export const now = new Date();
export const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
export const anchorWeekStart = startOfWeek(today);
export const FIRSTTIME = new Date(2025, 0, 1);

export function rowWeekStart(r) {
  if (state.firstDayOfWeek === 'sun') { return addDays(anchorWeekStart, 7 * r - 1); }
  return addDays(anchorWeekStart, 7 * r);
}

export function monthIdxForMonthrowRow(r) {
  const orientIdx = state.orientMonth ? state.orientMonth.y * 12 + state.orientMonth.m : today.getFullYear() * 12 + today.getMonth();
  return orientIdx + r;
}

export function monthrowDate(r, k) {
  const mi = monthIdxForMonthrowRow(r);
  const { y, m } = monthIdxToYM(mi);
  const base = monthBaseDate(y, m);
  return addDays(base, k);
}

export function monthRowGutterIdx(r) {
  const refK = state.camX + (W - GUTTER) / (3 * VIEW.cellW);
  const mi = monthIdxForMonthrowRow(r);
  const { y, m } = monthIdxToYM(mi);
  const base = monthBaseDate(y, m);
  const refDate = addDays(base, Math.round(refK));
  return refDate.getFullYear() * 12 + refDate.getMonth();
}

// ---------- диспетчер событий ----------
const listeners = new Map();
export const bus = {
  on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
  },
  off(event, handler) {
    const set = listeners.get(event);
    if (set) set.delete(handler);
  },
  emit(event, data) {
    const set = listeners.get(event);
    if (set) set.forEach((h) => h(data));
  },
};

// ---------- рендер-диспетчер ----------
let need = true;
export function requestRender() { need = true; }
export function consumeRenderFlag() { const v = need; need = false; return v; }

// ---------- масштабирование и удобные функции ----------
export function cursorPrecision() {
  const P = state.zoom * 100;
  if (P >= 450) return 1;
  if (P >= 350) return 5;
  if (P >= 220) return 10;
  if (P >= 150) return 15;
  return 30;
}

export function contentScale(Z) {
  if (Z >= 0.75) return 1;
  if (Z >= 0.5) return 0.75 + (Z - 0.5) / 0.25 * 0.25;
  if (Z >= 0.25) return 0.5625 + (Z - 0.25) / 0.25 * 0.1875;
  return 0.5625;
}

export function monthNumScale(Z) {
  if (Z >= 0.10) return 0.8;
  return contentScale(Z);
}

export function compactness(Z) { return clamp((0.8 - Z) / 0.1, 0, 1); }
export function rulerHeight() { return state.zoom * 100 >= 125 ? 26 : 14; }

export function layout(Z) {
  const cs = contentScale(Z);
  const c = compactness(Z);
  const ordY = 24 * cs;
  const dateY = ordY + (36 - 18 * c) * cs;
  return { cs, c, ordY, dateY, endAlpha: 1 - c };
}

export function monthGradientRGBA(date) {
  const dim = daysInMonth(date.getFullYear(), date.getMonth());
  const progress = (date.getDate() - 1) / (dim - 1);
  const monthNum = date.getMonth() + 1;
  if (monthNum % 2 === 1) {
    const a = 0.10 * (1 - progress);
    return rgbaOf(PAL.gradientOddRgb, a);
  } else {
    const a = 0.10 + (0.05 - 0.10) * progress;
    return rgbaOf(PAL.gradientEvenRgb, a);
  }
}

export function hourLabelConfig(P) {
  if (P >= 220) return { labels: 'all', bold: new Set([3,6,9,12,15,18,21]) };
  if (P >= 200) return { labels: new Set([3,6,9,12,15,18,21]), bold: new Set([3,6,9,12,15,18,21]) };
  if (P >= 150) return { labels: new Set([3,6,9,12,15,18,21]), bold: new Set([9,12,15,18]) };
  if (P >= 125) return { labels: new Set([9,12,15,18]), bold: new Set() };
  return null;
}

// ---------- hover ----------
export const hover = {
  hl: { dow: null, dowOrd: null, dateNum: null, weekNum: null, monthIdx: null, eventId: null,
        hoverDow: null, hoverWeekNum: null, hoverMonthIdx: null, hoverMonthWeekStart: null,
        hoverSeamLeft: null, hoverSeamRight: null },
  region: null,
  cell: null,
  headerK: null,
  gutterR: null,
};

export function resetHover() {
  hover.hl = { dow: null, dowOrd: null, dateNum: null, weekNum: null, monthIdx: null, eventId: null,
               hoverDow: null, hoverWeekNum: null, hoverMonthIdx: null, hoverMonthWeekStart: null,
               hoverSeamLeft: null, hoverSeamRight: null };
  hover.region = null;
  hover.cell = null;
  hover.headerK = null;
  hover.gutterR = null;
}

// ---------- счётчики для отладки ----------
export const counters = { cells: 0, events: 0 };

// ---------- общие функции отрисовки ----------
export function drawTopHeader(lvl) {
  ctx.fillStyle = PAL.chrome;
  ctx.fillRect(GUTTER, 0, W - GUTTER, HEADER);
  ctx.save();
  ctx.beginPath();
  ctx.rect(GUTTER, 0, W - GUTTER, HEADER);
  ctx.clip();
  const k0 = Math.floor(state.camX) - 1;
  const k1 = Math.ceil(state.camX + (W - GUTTER) / lvl.cellW) + 1;
  for (let k = k0; k <= k1; k++) {
    const x = GUTTER + (k - state.camX) * lvl.cellW;
    let dow;
    if (state.mode === 'monthrow') dow = (((k + 6) % 7) + 7) % 7;
    else dow = ((k % 7) + 7) % 7;
    const isHover = (hover.region === 'header' && hover.headerK === k);
    if (hover.hl.hoverDow !== null && dow === hover.hl.hoverDow) { ctx.fillStyle = PAL.hlHeaderDow; ctx.fillRect(x, 0, lvl.cellW, HEADER); }
    if (hover.hl.dow !== null && dow === hover.hl.dow) { ctx.fillStyle = PAL.hlHeaderDow; ctx.fillRect(x, 0, lvl.cellW, HEADER); }
    if (isHover) { ctx.fillStyle = PAL.hlHeaderHover; ctx.fillRect(x, 0, lvl.cellW, HEADER); }
    ctx.fillStyle = isHover ? PAL.accent : (dow >= 5 ? PAL.textWeekend : PAL.textCell);
    ctx.font = (isHover ? 'bold ' : '') + '12px ui-monospace,monospace';
    ctx.textAlign = 'center';
    ctx.fillText(DW[dow], x + lvl.cellW / 2, HEADER / 2 + 4);
    ctx.textAlign = 'left';
    ctx.strokeStyle = PAL.gridLine;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, HEADER);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawGutter(r0, r1, lvl) {
  ctx.fillStyle = PAL.chrome;
  ctx.fillRect(0, HEADER, GUTTER, H - HEADER);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, HEADER, GUTTER, H - HEADER);
  ctx.clip();
  for (let r = r0; r <= r1; r++) {
    const y = HEADER + (r - state.camY) * lvl.rowH;
    const wm = rowWeekStart(r);
    const wn = weekNumberOfMonday(wm);
    const isHover = (hover.region === 'gutter' && hover.gutterR === r);
    const isCur = today >= wm && today < addDays(wm, 7);
    if (hover.hl.hoverWeekNum !== null && wn === hover.hl.hoverWeekNum) { ctx.fillStyle = PAL.hlGutterWeek; ctx.fillRect(0, y, GUTTER, lvl.rowH); }
    if (hover.hl.weekNum !== null && wn === hover.hl.weekNum) { ctx.fillStyle = PAL.hlGutterWeek; ctx.fillRect(0, y, GUTTER, lvl.rowH); }
    if (isHover) { ctx.fillStyle = PAL.hlGutterHover; ctx.fillRect(0, y, GUTTER, lvl.rowH); }
    const lbl = buildWeekLabel(wm);
    ctx.fillStyle = isCur ? PAL.accent : (isHover ? PAL.text : PAL.textSoft);
    ctx.font = (isCur ? 'bold ' : '') + '11px ui-monospace,monospace';
    ctx.fillText(lbl.line1, 8, y + 16, GUTTER - 14);
    ctx.fillStyle = PAL.textDim; ctx.font = '10px ui-monospace,monospace';
    ctx.fillText(lbl.line2, 8, y + 30, GUTTER - 14);
    if (isCur) { ctx.fillStyle = PAL.nowLabel; ctx.font = '9px ui-monospace,monospace'; ctx.fillText('● сейчас', 8, y + lvl.rowH - 6); }
    ctx.strokeStyle = PAL.gridLine;
    ctx.beginPath();
    ctx.moveTo(0, y + lvl.rowH + 0.5);
    ctx.lineTo(GUTTER, y + lvl.rowH + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawHoverOutline(lvl) {
  if (hover.region !== 'grid' || !hover.cell) return;
  const { r, k } = hover.cell;
  const x = GUTTER + (k - state.camX) * lvl.cellW;
  const y = HEADER + (r - state.camY) * lvl.rowH;
  ctx.strokeStyle = PAL.accent;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 1, y + 1, lvl.cellW - 2, lvl.rowH - 2);
  ctx.lineWidth = 1;
}

export function drawTimeCursor(getBounds) {
  if (!state.mouse || state.mode !== 'map') return;
  const mx = state.mouse.x, my = state.mouse.y;
  const cw = VIEW.cellW, ch = VIEW.rowH, prec = cursorPrecision();
  const showLabel = state.zoom >= 0.5;
  ctx.lineWidth = 1;
  if (hover.region === 'grid') {
    const r = Math.floor(state.camY + (my - HEADER) / ch);
    const k = Math.floor(state.camX + (mx - GUTTER) / cw);
    const y = HEADER + (r - state.camY) * ch;
    const colX = GUTTER + (k - state.camX) * cw;
    const raw = ((mx - colX) / cw) * 1440;
    const s = snapTime(raw, getBounds(addDays(anchorWeekStart, 7 * r + k)), cw, prec);
    const lx = colX + (s.line / 1440) * cw;
    ctx.strokeStyle = rgbaOf(PAL.whiteRgb, 0.5);
    ctx.beginPath();
    ctx.moveTo(lx + 0.5, y);
    ctx.lineTo(lx + 0.5, y + ch);
    ctx.stroke();
    if (showLabel) drawTimeLabel(lx, y + 82, s.label);
  } else if (hover.region === 'header') {
    ctx.strokeStyle = rgbaOf(PAL.whiteRgb, 0.5);
    ctx.beginPath();
    ctx.moveTo(mx + 0.5, HEADER);
    ctx.lineTo(mx + 0.5, H);
    ctx.stroke();
    const k = Math.floor(state.camX + (mx - GUTTER) / cw);
    const colX = GUTTER + (k - state.camX) * cw;
    const mins = Math.round(((mx - colX) / cw) * 1440 / prec) * prec;
    if (showLabel) drawTimeLabel(mx, H / 2, mins);
  }
}

export function drawTimeCursorTimeline(getBounds) {
  if (!state.mouse || state.mouse.y < (H - VIEW.rowH) / 2 || state.mouse.y > (H + VIEW.rowH) / 2) return;
  const mx = state.mouse.x;
  const ch = VIEW.rowH, y = (H - ch) / 2, cw = VIEW.cellW, prec = cursorPrecision();
  const k = Math.floor(state.camX + mx / cw);
  const colX = (k - state.camX) * cw;
  const raw = ((mx - colX) / cw) * 1440;
  const s = snapTime(raw, getBounds(addDays(anchorWeekStart, 7 * state.activeRow + k)), cw, prec);
  const lx = colX + (s.line / 1440) * cw;
  ctx.strokeStyle = rgbaOf(PAL.whiteRgb, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(lx + 0.5, y);
  ctx.lineTo(lx + 0.5, y + ch);
  ctx.stroke();
  if (state.zoom >= 0.5) drawTimeLabel(lx, y + ch / 2, s.label);
}

export function drawTimeLabel(x, y, mins) {
  const txt = mm(Math.max(0, Math.min(mins, 1440)));
  ctx.font = '10px ui-monospace,monospace';
  const w = ctx.measureText(txt).width + 10;
  const bx = Math.max(GUTTER + 2, Math.min(x - w / 2, W - w - 2));
  ctx.fillStyle = PAL.timeLabelBg;
  rr(bx, y - 9, w, 15, 3);
  ctx.fill();
  ctx.strokeStyle = rgbaOf(PAL.whiteRgb, 0.35);
  rr(bx + 0.5, y - 8.5, w - 1, 14, 3);
  ctx.stroke();
  ctx.fillStyle = PAL.white;
  ctx.textAlign = 'center';
  ctx.fillText(txt, bx + w / 2, y + 2.5);
  ctx.textAlign = 'left';
}

export function snapTime(m, bounds, cw, prec) {
  const radiusMin = 20 * 1440 / cw;
  let best = null, bd = 1e9;
  for (const b of bounds) {
    const d = Math.abs(m - b);
    if (d < bd) { bd = d; best = b; }
  }
  if (best !== null && bd < radiusMin) {
    const t = 1 - bd / radiusMin;
    const pull = Math.pow(t, 1.3) * 0.95;
    const line = m + (best - m) * pull;
    const label = (bd < radiusMin * 0.55) ? best : Math.round(line / prec) * prec;
    return { line, label };
  }
  return { line: m, label: Math.round(m / prec) * prec };
}

export function rr(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
