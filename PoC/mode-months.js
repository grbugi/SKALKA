/**
 * mode-months.js
 * Режим «месяцы» (month-row): строки = месяцы, ячейки = дни.
 */

import {
  ctx, W, H, GUTTER, HEADER, PAL, state, VIEW, anchorWeekStart, today, now,
  addDays, sameDay, dowMon0, daysInMonth, startOfWeekFDOW, dayIdx, dateFromDayIdx,
  monthIdxForMonthrowRow, monthIdxToYM, monthBaseDate, monthRowGutterIdx,
  monthGradientRGBA, monthNumScale, rr, drawHoverOutline, drawTopHeader, hover, counters, MF
} from './core.js';
import { EVENTS, occursOn } from './events.js';

/**
 * Вычисляет полосы событий для строки месяца r.
 */
export function computeMonthRowBars(r) {
  const lvl = VIEW;
  const y = HEADER + (r - state.camY) * lvl.rowH;
  const mi = monthIdxForMonthrowRow(r);
  const { y: yy, m: mm } = monthIdxToYM(mi);
  const base = monthBaseDate(yy, mm);
  const baseDayIdx = dayIdx(base);
  const maxDur = Math.max(...EVENTS.map(e => e.dur)) / 1440;
  const kLo = Math.floor(state.camX - maxDur) - 1;
  const kHi = Math.ceil(state.camX + (W - GUTTER) / lvl.cellW) + 1;
  const segs = [];
  for (let k = kLo; k <= kHi; k++) {
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
  const laneH = 4;
  const totalH = lanes.length * (laneH + 2);
  const baseY = y + lvl.rowH - 4;
  return segs.map(sg => ({
    e: sg.e,
    x0: GUTTER + (sg.s - state.camX) * lvl.cellW,
    x1: GUTTER + (sg.en - state.camX) * lvl.cellW,
    y0: baseY - totalH + sg.lane * (laneH + 2),
    y1: baseY - totalH + sg.lane * (laneH + 2) + laneH,
    laneH
  }));
}

function renderMonthRowRow(r, y, lvl) {
  const mi = monthIdxForMonthrowRow(r);
  const { y: yy, m: mm } = monthIdxToYM(mi);
  const base = monthBaseDate(yy, mm);
  const baseDayIdx = dayIdx(base);
  const k0 = Math.floor(state.camX) - 1;
  const k1 = Math.ceil(state.camX + (W - GUTTER) / lvl.cellW) + 1;
  const numScale = monthNumScale(state.zoom);
  const isHoverRow = (hover.cell && hover.cell.r === r);
  for (let k = k0; k <= k1; k++) {
    const date = dateFromDayIdx(baseDayIdx + k);
    const x = GUTTER + (k - state.camX) * lvl.cellW;
    const first = date.getDate() === 1;
    const dow = dowMon0(date);
    ctx.fillStyle = first ? PAL.cellBgFirst : (sameDay(date, today) ? PAL.cellBgToday : PAL.cellBg);
    ctx.fillRect(x, y, lvl.cellW, lvl.rowH);
    const ga = monthGradientRGBA(date);
    ctx.fillStyle = ga;
    ctx.fillRect(x, y, lvl.cellW, lvl.rowH);
    if (isHoverRow) { ctx.fillStyle = PAL.hlMonthrowRow; ctx.fillRect(x, y, lvl.cellW, lvl.rowH); }
    if (hover.hl.hoverMonthIdx !== null && hover.hl.hoverMonthWeekStart !== null && (date.getFullYear() * 12 + date.getMonth()) === hover.hl.hoverMonthIdx) {
      const cellWeekStart = startOfWeekFDOW(date);
      if (sameDay(cellWeekStart, hover.hl.hoverMonthWeekStart)) {
        ctx.fillStyle = PAL.hlMonthrowWeek;
        ctx.fillRect(x, y, lvl.cellW, lvl.rowH);
      }
    }
    if (hover.hl.dow !== null && dow === hover.hl.dow) { ctx.fillStyle = PAL.hlDow; ctx.fillRect(x, y, lvl.cellW, lvl.rowH); }
    if (hover.hl.dateNum !== null && date.getDate() === hover.hl.dateNum) { ctx.fillStyle = PAL.hlDate; ctx.fillRect(x, y, lvl.cellW, lvl.rowH); }
    if (hover.hl.monthIdx !== null && (date.getFullYear() * 12 + date.getMonth()) === hover.hl.monthIdx) { ctx.fillStyle = PAL.hlWeekMonth; ctx.fillRect(x, y, lvl.cellW, lvl.rowH); }
    ctx.strokeStyle = sameDay(date, today) ? PAL.cellBorderToday : PAL.gridLine;
    ctx.strokeRect(x + 0.5, y + 0.5, lvl.cellW - 1, lvl.rowH - 1);
    if (sameDay(date, today)) {
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const tx = x + (nowMin / 1440) * lvl.cellW;
      ctx.strokeStyle = PAL.nowLine; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(tx, y + 3); ctx.lineTo(tx, y + lvl.rowH - 3); ctx.stroke();
      ctx.lineWidth = 1;
    }
    const seamDow = state.firstDayOfWeek === 'sun' ? 5 : 6;
    if (dow === seamDow) { ctx.fillStyle = PAL.seamLine; ctx.fillRect(x + lvl.cellW - 3, y, 3, lvl.rowH); }
    ctx.font = `bold ${Math.round(20 * numScale)}px ui-monospace,monospace`;
    let monthColor = PAL.text;
    if (hover.hl.dateNum === date.getDate()) {
      monthColor = PAL.hlDateStrong;
    } else if (sameDay(date, today)) {
      monthColor = PAL.textDaynumToday;
    } else if (first) {
      monthColor = date.getMonth() % 2 === 0 ? PAL.monthLabelOdd : PAL.monthLabelEven;
    }
    ctx.fillStyle = monthColor;
    ctx.fillText(String(date.getDate()), x + 6, y + lvl.rowH * 0.6);
  }
  const bars = computeMonthRowBars(r);
  counters.events = bars.length;
  for (const b of bars) {
    const isHl = (hover.hl.eventId !== null && b.e.id === hover.hl.eventId);
    ctx.globalAlpha = isHl ? 1 : 0.8;
    ctx.fillStyle = b.e.color;
    rr(b.x0, b.y0, Math.max(b.x1 - b.x0, 2), b.y1 - b.y0, 2);
    ctx.fill();
    if (isHl) {
      ctx.strokeStyle = PAL.white; ctx.lineWidth = 1.5;
      rr(b.x0, b.y0, Math.max(b.x1 - b.x0, 2), b.y1 - b.y0, 2);
      ctx.stroke(); ctx.lineWidth = 1;
    }
    ctx.globalAlpha = 1;
  }
}

function drawMonthRowFrames(r0, r1, lvl) {
  ctx.strokeStyle = PAL.monthFrame; ctx.lineWidth = 1.5;
  const k0 = Math.floor(state.camX) - 1;
  const k1 = Math.ceil(state.camX + (W - GUTTER) / lvl.cellW) + 1;
  for (let r = r0; r <= r1; r++) {
    const mi = monthIdxForMonthrowRow(r);
    const { y: yy, m: mm } = monthIdxToYM(mi);
    const base = monthBaseDate(yy, mm);
    const baseDayIdx = dayIdx(base);
    for (let k = k0; k <= k1; k++) {
      const date = dateFromDayIdx(baseDayIdx + k);
      const x = GUTTER + (k - state.camX) * lvl.cellW, y = HEADER + (r - state.camY) * lvl.rowH;
      if (date.getMonth() !== addDays(date, 1).getMonth()) {
        ctx.beginPath(); ctx.moveTo(x + lvl.cellW, y); ctx.lineTo(x + lvl.cellW, y + lvl.rowH); ctx.stroke();
      }
    }
  }
  ctx.lineWidth = 1;
}

function drawMonthRowGutter(r0, r1, lvl) {
  ctx.fillStyle = PAL.chrome; ctx.fillRect(0, HEADER, GUTTER, H - HEADER);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, HEADER, GUTTER, H - HEADER); ctx.clip();
  for (let r = r0; r <= r1; r++) {
    const y = HEADER + (r - state.camY) * lvl.rowH;
    const gutIdx = monthRowGutterIdx(r);
    const { y: yy, m: mm } = monthIdxToYM(gutIdx);
    const isHover = (hover.region === 'gutter' && hover.gutterR === r);
    const isCur = (today.getFullYear() === yy && today.getMonth() === mm);
    if (hover.hl.hoverMonthIdx !== null && gutIdx === hover.hl.hoverMonthIdx) { ctx.fillStyle = PAL.hlMonthrowRow; ctx.fillRect(0, y, GUTTER, lvl.rowH); }
    if (hover.hl.monthIdx !== null && gutIdx === hover.hl.monthIdx) { ctx.fillStyle = PAL.hlGutterWeek; ctx.fillRect(0, y, GUTTER, lvl.rowH); }
    if (isHover) { ctx.fillStyle = PAL.hlGutterHover; ctx.fillRect(0, y, GUTTER, lvl.rowH); }
    ctx.fillStyle = isCur ? PAL.accent : (isHover ? PAL.text : PAL.textSoft);
    ctx.font = (isCur ? 'bold ' : '') + '11px ui-monospace,monospace';
    ctx.fillText(MF[mm] + ' ' + yy, 8, y + 16, GUTTER - 14);
    if (isCur) { ctx.fillStyle = PAL.nowLabel; ctx.font = '9px ui-monospace,monospace'; ctx.fillText('● сейчас', 8, y + lvl.rowH - 6); }
    ctx.strokeStyle = PAL.gridLine;
    ctx.beginPath(); ctx.moveTo(0, y + lvl.rowH + 0.5); ctx.lineTo(GUTTER, y + lvl.rowH + 0.5); ctx.stroke();
  }
  ctx.restore();
}

/**
 * Отрисовка режима «месяцы».
 */
export function renderMonthRow() {
  ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, W, H);
  const lvl = VIEW;
  const gridH = H - HEADER, gridW = W - GUTTER;
  const r0 = Math.floor(state.camY) - 1, r1 = Math.ceil(state.camY + gridH / lvl.rowH) + 1;
  const k0 = Math.floor(state.camX) - 1, k1 = Math.ceil(state.camX + (W - GUTTER) / lvl.cellW) + 1;
  counters.cells = (r1 - r0 + 1) * (k1 - k0 + 1);
  ctx.save();
  ctx.beginPath(); ctx.rect(GUTTER, HEADER, gridW, gridH); ctx.clip();
  for (let r = r0; r <= r1; r++) {
    renderMonthRowRow(r, HEADER + (r - state.camY) * lvl.rowH, lvl);
  }
  ctx.strokeStyle = PAL.gridLine;
  for (let r = r0; r <= r1; r++) {
    const y = HEADER + (r - state.camY) * lvl.rowH;
    ctx.beginPath(); ctx.moveTo(GUTTER, y + lvl.rowH + 0.5); ctx.lineTo(W, y + lvl.rowH + 0.5); ctx.stroke();
  }
  drawMonthRowFrames(r0, r1, lvl);
  drawHoverOutline(lvl);
  ctx.restore();
  drawTopHeader(lvl);
  drawMonthRowGutter(r0, r1, lvl);
  ctx.fillStyle = PAL.chrome; ctx.fillRect(0, 0, GUTTER, HEADER);
  ctx.fillStyle = PAL.textFaint; ctx.font = '9px ui-monospace,monospace';
  ctx.fillText('месяцы ↓', 8, HEADER / 2 + 3);
  ctx.strokeStyle = PAL.border;
  ctx.beginPath(); ctx.moveTo(0, HEADER + 0.5); ctx.lineTo(W, HEADER + 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(GUTTER + 0.5, 0); ctx.lineTo(GUTTER + 0.5, H); ctx.stroke();
}
