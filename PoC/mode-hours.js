/**
 * mode-hours.js
 * Режим «часы» (таймлайн): одна активная строка с крупной шкалой времени.
 */

import {
  ctx, W, H, PAL, state, VIEW, anchorWeekStart, today, now,
  addDays, sameDay, dowMon0, weekNumOfMonth, startOfWeekFDOW,
  monthGradientRGBA, clamp, pad2, dayIdx, dateFromDayIdx, MF, DW, DWU, ORD_END, rr,
  drawTimeCursorTimeline, hover, counters
} from './core.js';
import { EVENTS, occursOn, getEventBounds } from './events.js';

/**
 * Вычисляет полосы событий для режима «часы».
 */
export function computeTimelineBars() {
  const r = state.activeRow;
  const ch = VIEW.rowH, y = (H - ch) / 2, cw = VIEW.cellW;
  const baseDayIdx = dayIdx(addDays(anchorWeekStart, 7 * r));
  const maxDur = Math.max(...EVENTS.map(e => e.dur)) / 1440;
  const k0 = Math.floor(state.camX) - 1;
  const k1 = Math.ceil(state.camX + W / cw) + 1;
  const kStart = Math.floor(k0 - maxDur);
  const segs = [];
  for (let k = kStart; k <= k1; k++) {
    const D = dateFromDayIdx(baseDayIdx + k);
    for (const e of EVENTS) {
      if (!occursOn(e, D)) continue;
      segs.push({ e, s: k + e.start / 1440, en: k + (e.start + e.dur) / 1440 });
    }
  }
  segs.sort((a, b) => a.s - b.s);
  const lanes = [];
  for (const sg of segs) {
    let li = 0;
    while (lanes[li] !== undefined && lanes[li] > sg.s) li++;
    lanes[li] = sg.en;
    sg.lane = li;
  }
  const laneH = Math.min(22, (ch - 100) / Math.max(lanes.length, 1));
  const baseY = y + ch * 0.4;
  return segs.map(sg => ({
    e: sg.e,
    x0: (sg.s - state.camX) * cw,
    x1: (sg.en - state.camX) * cw,
    y0: baseY + sg.lane * (laneH + 4),
    y1: baseY + sg.lane * (laneH + 4) + laneH,
    laneH
  }));
}

function renderTimelineDayCell(date, x, y, cw, ch) {
  const first = date.getDate() === 1;
  ctx.fillStyle = first ? PAL.cellBgFirst : PAL.cellBg;
  ctx.fillRect(x, y, cw, ch);
  const ga = monthGradientRGBA(date);
  ctx.fillStyle = ga;
  ctx.fillRect(x, y, cw, ch);
  ctx.strokeStyle = PAL.border;
  ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);
  const dw = dowMon0(date);
  const ord = Math.floor((date.getDate() - 1) / 7) + 1;
  const endTxt = ORD_END[dw];
  const wm = startOfWeekFDOW(date);
  const wn = weekNumOfMonth(wm, date.getFullYear(), date.getMonth());
  const line1 = `${date.getDate()} ${MF[date.getMonth()]} ${date.getFullYear()}`;
  const line2 = `${ord}${endTxt} ${DWU[dw]}, ${wn}-я неделя`;
  ctx.font = 'bold 16px ui-monospace,monospace';
  const tw1 = ctx.measureText(line1).width;
  ctx.font = '14px ui-monospace,monospace';
  const tw2 = ctx.measureText(line2).width;
  const maxTW = Math.max(tw1, tw2);
  let textX = x + 8;
  textX = Math.max(textX, 8);
  textX = Math.min(textX, x + cw - maxTW - 8);
  ctx.fillStyle = first ? PAL.accent : PAL.text;
  ctx.font = 'bold 16px ui-monospace,monospace';
  ctx.fillText(line1, textX, y + 24);
  ctx.font = '14px ui-monospace,monospace';
  ctx.fillStyle = PAL.textSoft;
  ctx.fillText(line2, textX, y + 46);
}

function renderTimelineEvents() {
  const bars = computeTimelineBars();
  counters.events = bars.length;
  for (const b of bars) {
    if (b.x1 < 0 || b.x0 > W) continue;
    const isHl = (hover.hl.eventId !== null && b.e.id === hover.hl.eventId);
    ctx.fillStyle = b.e.color;
    ctx.globalAlpha = isHl ? 1 : 0.8;
    rr(b.x0, b.y0, Math.max(b.x1 - b.x0, 2), b.y1 - b.y0, 3);
    ctx.fill();
    if (isHl) {
      ctx.strokeStyle = PAL.white; ctx.lineWidth = 1.5;
      rr(b.x0, b.y0, Math.max(b.x1 - b.x0, 2), b.y1 - b.y0, 3);
      ctx.stroke(); ctx.lineWidth = 1;
    }
    ctx.globalAlpha = 1;
    if (b.x1 - b.x0 > 44) {
      ctx.fillStyle = PAL.bg;
      ctx.font = '9px ui-monospace,monospace';
      ctx.fillText(b.e.title, b.x0 + 4, b.y0 + (b.y1 - b.y0) * 0.7);
    }
  }
}

function renderTimelineDayTicks(x, y, cw, ch) {
  const Z = state.zoom;
  const baseY = y + ch;
  const labelY = baseY - 14;
  ctx.textAlign = 'center';
  for (let h = 0; h < 24; h++) {
    const tx = x + (h / 24) * cw;
    ctx.strokeStyle = `rgba(255,255,255,0.18)`;
    ctx.beginPath(); ctx.moveTo(tx, y + 60); ctx.lineTo(tx, baseY); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,0.55)`;
    ctx.font = 'bold 11px ui-monospace,monospace';
    ctx.fillText(String(h), tx, labelY);
  }
  let step = null;
  if (Z >= 20) step = 15;
  else if (Z >= 12.5) step = 30;
  if (step) {
    const perDay = 1440 / step;
    for (let i = 0; i < perDay; i++) {
      const min = i * step;
      if (min % 60 === 0) continue;
      const tx = x + (min / 1440) * cw;
      ctx.strokeStyle = `rgba(255,255,255,0.08)`;
      ctx.beginPath(); ctx.moveTo(tx, y + 60); ctx.lineTo(tx, baseY); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,0.4)`;
      ctx.font = '9px ui-monospace,monospace';
      ctx.fillText(pad2(Math.floor(min / 60)) + ':' + pad2(min % 60), tx, labelY);
    }
  }
  ctx.textAlign = 'left';
}

function drawNowLineTimeline(r, y, cw, ch) {
  const todayDayIdx = dayIdx(today);
  const rowStartIdx = dayIdx(addDays(anchorWeekStart, 7 * r));
  const k = todayDayIdx - rowStartIdx;
  if (k < 0 || k >= 7) return;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const x = (k + nowMin / 1440 - state.camX) * cw;
  if (x < 0 || x > W) return;
  ctx.strokeStyle = PAL.nowLine;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.lineTo(x, y + ch - 3); ctx.stroke();
  ctx.lineWidth = 1;
}

/**
 * Отрисовка режима «часы».
 */
export function renderTimeline() {
  ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, W, H);
  const r = state.activeRow;
  const ch = VIEW.rowH, y = (H - ch) / 2;
  const lvl = VIEW;
  const k0 = Math.floor(state.camX) - 1;
  const k1 = Math.ceil(state.camX + W / lvl.cellW) + 1;
  counters.cells = k1 - k0 + 1;
  for (let k = k0; k <= k1; k++) {
    const date = addDays(anchorWeekStart, 7 * r + k);
    const x = (k - state.camX) * lvl.cellW;
    renderTimelineDayCell(date, x, y, lvl.cellW, ch);
  }
  renderTimelineEvents();
  for (let k = k0; k <= k1; k++) {
    const date = addDays(anchorWeekStart, 7 * r + k);
    const x = (k - state.camX) * lvl.cellW;
    renderTimelineDayTicks(x, y, lvl.cellW, ch);
  }
  drawNowLineTimeline(r, y, lvl.cellW, ch);
  if (hover.region === 'grid' && hover.cell) {
    const hx = (hover.cell.k - state.camX) * lvl.cellW;
    ctx.strokeStyle = PAL.accent; ctx.lineWidth = 1.5;
    ctx.strokeRect(hx + 1, y + 1, lvl.cellW - 2, ch - 2);
    ctx.lineWidth = 1;
  }
  drawTimeCursorTimeline(getEventBounds);
}
