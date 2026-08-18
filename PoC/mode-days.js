/**
 * mode-days.js
 * Режим «дни» (карта): ячейки недель, подсветки, швы, водяные знаки месяцев.
 */

import {
  ctx, W, H, GUTTER, HEADER, PAL, state, VIEW, anchorWeekStart, today, now,
  addDays, sameDay, dowMon0, daysInMonth, weekNumberOfMonday, startOfWeekFDOW,
  startOfWeek, monthGradientRGBA, layout, contentScale, rulerHeight, hourLabelConfig,
  clamp, dayIdx, dateFromDayIdx, MF, DW, DWU, ORD_END,
  drawTopHeader, drawGutter, drawHoverOutline, drawTimeCursor, rgbaOf, rr,
  hover, counters
} from './core.js';
import { EVENTS, occursOn, getEventBounds } from './events.js';

/**
 * Вычисляет координаты полос событий для строки r.
 */
export function computeRowBars(r) {
  const lvl = VIEW;
  const cs = contentScale(state.zoom);
  const y = HEADER + (r - state.camY) * lvl.rowH;
  const baseDayIdx = dayIdx(addDays(anchorWeekStart, 7 * r));
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
  const laneH = 11 * cs;
  const top = y + lvl.rowH - rulerHeight() - lanes.length * (laneH + 2);
  return segs.map(sg => ({
    e: sg.e, laneH,
    x0: GUTTER + (sg.s - state.camX) * lvl.cellW,
    x1: GUTTER + (sg.en - state.camX) * lvl.cellW,
    y0: top + sg.lane * (laneH + 2),
    y1: top + sg.lane * (laneH + 2) + laneH
  }));
}

function drawDayEvents(r, y, lvl) {
  const bars = computeRowBars(r);
  counters.events = bars.length;
  const cs = contentScale(state.zoom);
  for (const b of bars) {
    const isHl = (hover.hl.eventId !== null && b.e.id === hover.hl.eventId);
    ctx.globalAlpha = isHl ? 1 : 0.92;
    ctx.fillStyle = b.e.color;
    rr(b.x0, b.y0, Math.max(b.x1 - b.x0, 2), b.y1 - b.y0, 3 * cs);
    ctx.fill();
    if (isHl) {
      ctx.strokeStyle = PAL.white;
      ctx.lineWidth = 1.5;
      rr(b.x0, b.y0, Math.max(b.x1 - b.x0, 2), b.y1 - b.y0, 3 * cs);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.globalAlpha = 1;
    if (b.x1 - b.x0 > 46) {
      ctx.fillStyle = PAL.bg;
      ctx.font = `${9 * cs}px ui-monospace,monospace`;
      ctx.fillText(b.e.title, b.x0 + 4, b.y0 + b.laneH * 0.75);
    }
  }
}

function drawHourTicks(x, y, cw, ch) {
  const P = state.zoom * 100, baseY = y + ch, Z = state.zoom;
  const smallA = clamp((Z - 0.5) / 0.05, 0, 1);
  const largeA = clamp((Z - 0.25) / 0.05, 0, 1);
  if (largeA <= 0) return;
  if (P >= 450) {
    ctx.strokeStyle = rgbaOf(PAL.whiteRgb, 0.08 * largeA);
    for (let q = 1; q < 96; q++) {
      if (q % 4 === 0 || q % 2 === 0) continue;
      const tx = x + (q / 96) * cw;
      ctx.beginPath(); ctx.moveTo(tx, baseY); ctx.lineTo(tx, baseY - 4); ctx.stroke();
    }
  }
  if (P >= 350) {
    ctx.strokeStyle = rgbaOf(PAL.whiteRgb, 0.15 * largeA);
    for (let h = 0; h < 24; h++) {
      const tx = x + ((h + 0.5) / 24) * cw;
      ctx.beginPath(); ctx.moveTo(tx, baseY); ctx.lineTo(tx, baseY - 6); ctx.stroke();
    }
  }
  if (cw >= 35) {
    const cfg = hourLabelConfig(P);
    const labelY = baseY - 14;
    for (let h = 0; h <= 24; h++) {
      const large = (h % 3 === 0);
      const a = large ? 0.2 * largeA : 0.07 * smallA;
      if (a <= 0) continue;
      const tx = x + (h / 24) * cw;
      const th = large ? 10 : 5;
      ctx.strokeStyle = rgbaOf(PAL.whiteRgb, a);
      ctx.beginPath(); ctx.moveTo(tx, baseY); ctx.lineTo(tx, baseY - th); ctx.stroke();
      if (cfg) {
        const isLabeled = cfg.labels === 'all' ? (h >= 1 && h <= 23) : cfg.labels.has(h);
        if (isLabeled) {
          const isBold = cfg.bold.has(h);
          ctx.fillStyle = isBold ? rgbaOf(PAL.whiteRgb, 0.8 * largeA) : rgbaOf(PAL.whiteRgb, 0.45 * largeA);
          ctx.font = (isBold ? 'bold ' : '') + '8px ui-monospace,monospace';
          ctx.textAlign = 'center';
          ctx.fillText(String(h), tx, labelY);
          ctx.textAlign = 'left';
        }
      }
    }
  }
}

function renderRowDays(r, y, lvl) {
  const L = layout(state.zoom);
  const k0 = Math.floor(state.camX) - 1;
  const k1 = Math.ceil(state.camX + (W - GUTTER) / lvl.cellW) + 1;
  const isHoverRow = (hover.cell && hover.cell.r === r);
  for (let k = k0; k <= k1; k++) {
    const date = addDays(anchorWeekStart, 7 * r + k);
    const x = GUTTER + (k - state.camX) * lvl.cellW;
    const first = date.getDate() === 1;
    const ord = Math.floor((date.getDate() - 1) / 7) + 1;
    const dow = dowMon0(date);
    ctx.fillStyle = first ? PAL.cellBgFirst : (sameDay(date, today) ? PAL.cellBgToday : PAL.cellBg);
    ctx.fillRect(x, y, lvl.cellW, lvl.rowH);
    const ga = monthGradientRGBA(date);
    ctx.fillStyle = ga;
    ctx.fillRect(x, y, lvl.cellW, lvl.rowH);

    if (hover.hl.hoverDow !== null && dow === hover.hl.hoverDow) { ctx.fillStyle = PAL.hlHoverDow; ctx.fillRect(x, y, lvl.cellW, lvl.rowH); }
    if (isHoverRow) { ctx.fillStyle = PAL.hlHoverRow; ctx.fillRect(x, y, lvl.cellW, lvl.rowH); }

    if (hover.hl.hoverMonthIdx !== null && hover.hl.hoverSeamLeft !== null && hover.hl.hoverSeamRight !== null) {
      const cellMonthIdx = date.getFullYear() * 12 + date.getMonth();
      if (cellMonthIdx === hover.hl.hoverMonthIdx) {
        if (k >= hover.hl.hoverSeamLeft && k <= hover.hl.hoverSeamRight) {
          ctx.fillStyle = PAL.silhouetteMonth;
          ctx.fillRect(x, y, lvl.cellW, lvl.rowH);
        }
      }
    }

    if (hover.hl.dow !== null && dow === hover.hl.dow) { ctx.fillStyle = PAL.hlDow; ctx.fillRect(x, y, lvl.cellW, lvl.rowH); }
    if (hover.hl.dowOrd !== null && ord === hover.hl.dowOrd.ord && dow === hover.hl.dowOrd.dow) { ctx.fillStyle = PAL.hlOrd; ctx.fillRect(x, y, lvl.cellW, lvl.rowH); }
    if (hover.hl.dateNum !== null && date.getDate() === hover.hl.dateNum) { ctx.fillStyle = PAL.hlDate; ctx.fillRect(x, y, lvl.cellW, lvl.rowH); }
    if (hover.hl.weekNum !== null && weekNumberOfMonday(startOfWeekFDOW(date)) === hover.hl.weekNum) { ctx.fillStyle = PAL.hlWeekMonth; ctx.fillRect(x, y, lvl.cellW, lvl.rowH); }
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
    drawHourTicks(x, y, lvl.cellW, lvl.rowH);
    const seamDow = state.firstDayOfWeek === 'sun' ? 5 : 6;
    if (dow === seamDow) { ctx.fillStyle = PAL.seamLine; ctx.fillRect(x + lvl.cellW - 3, y, 3, lvl.rowH); }

    ctx.font = `bold ${14 * L.cs}px ui-monospace,monospace`;
    const ordTxt = String(ord), endTxt = ORD_END[dow];
    const wOrd = ctx.measureText(ordTxt).width;
    const wEnd = ctx.measureText(endTxt).width * L.endAlpha;
    ctx.fillStyle = PAL.textCell;
    ctx.fillText(ordTxt, x + 6, y + L.ordY);
    if (L.endAlpha > 0.02) {
      ctx.globalAlpha = L.endAlpha;
      ctx.fillText(endTxt, x + 6 + wOrd, y + L.ordY);
      ctx.globalAlpha = 1;
    }

    const highlightedOrd = hover.hl.dowOrd && ord === hover.hl.dowOrd.ord && dow === hover.hl.dowOrd.dow;
    ctx.fillStyle = highlightedOrd ? PAL.hlOrdStrong : PAL.textCell;
    if (!highlightedOrd && hover.hl.hoverSeamLeft !== null && hover.hl.hoverSeamRight !== null &&
        k >= hover.hl.hoverSeamLeft && k <= hover.hl.hoverSeamRight &&
        (date.getFullYear() * 12 + date.getMonth()) === hover.hl.hoverMonthIdx) {
      ctx.fillStyle = PAL.text;
    }
    ctx.fillText(DWU[dow], x + 6 + wOrd + wEnd + ctx.measureText(' ').width, y + L.ordY);

    ctx.font = `bold ${24 * L.cs}px ui-monospace,monospace`;
    const isToday = sameDay(date, today);
    let dayColor = PAL.textDaynum;
    if (hover.hl.dateNum === date.getDate()) {
      dayColor = PAL.hlDateStrong;
    } else if (isToday) {
      dayColor = PAL.textDaynumToday;
    } else if (first) {
      dayColor = date.getMonth() % 2 === 0 ? PAL.monthLabelOdd : PAL.monthLabelEven;
    } else if (hover.hl.hoverSeamLeft !== null && hover.hl.hoverSeamRight !== null &&
               k >= hover.hl.hoverSeamLeft && k <= hover.hl.hoverSeamRight &&
               (date.getFullYear() * 12 + date.getMonth()) === hover.hl.hoverMonthIdx) {
      dayColor = PAL.text;
    }
    ctx.fillStyle = dayColor;
    ctx.fillText(String(date.getDate()), x + 6, y + L.dateY);
    if (first) {
      ctx.font = `${10 * L.cs}px ui-monospace,monospace`;
      let monthColor = date.getMonth() % 2 === 0 ? PAL.monthLabelOdd : PAL.monthLabelEven;
      if (isToday) monthColor = PAL.textDaynumToday;
      ctx.fillStyle = monthColor;
      ctx.fillText(MF[date.getMonth()], x + 6, y + L.dateY + 16 * L.cs);
    }
  }
  drawDayEvents(r, y, lvl);
}

function drawMonthFrames(r0, r1, lvl) {
  ctx.strokeStyle = PAL.monthFrame; ctx.lineWidth = 1.5;
  const k0 = Math.floor(state.camX) - 1;
  const k1 = Math.ceil(state.camX + (W - GUTTER) / lvl.cellW) + 1;
  for (let r = r0; r <= r1; r++) {
    for (let k = k0; k <= k1; k++) {
      const date = addDays(anchorWeekStart, 7 * r + k);
      const x = GUTTER + (k - state.camX) * lvl.cellW, y = HEADER + (r - state.camY) * lvl.rowH;
      if (date.getMonth() !== addDays(date, 1).getMonth()) {
        ctx.beginPath(); ctx.moveTo(x + lvl.cellW, y); ctx.lineTo(x + lvl.cellW, y + lvl.rowH); ctx.stroke();
      }
      if (date.getMonth() !== addDays(date, 7).getMonth()) {
        ctx.beginPath(); ctx.moveTo(x, y + lvl.rowH); ctx.lineTo(x + lvl.cellW, y + lvl.rowH); ctx.stroke();
      }
    }
  }
  ctx.lineWidth = 1;
}

function drawMonthWatermarks(r0, r1, lvl) {
  const gridW = W - GUTTER;
  const visCols = gridW / lvl.cellW;
  const fs = 32;
  ctx.font = `bold ${fs}px ui-monospace,monospace`;
  ctx.textAlign = 'center';
  const dLo = 7 * r0 + state.camX - 14;
  const dHi = 7 * (r1 + 1) + state.camX + visCols + 14;
  const dateLo = addDays(anchorWeekStart, Math.floor(dLo));
  const dateHi = addDays(anchorWeekStart, Math.ceil(dHi));
  let y = dateLo.getFullYear(), m = dateLo.getMonth();
  const yEnd = dateHi.getFullYear(), mEnd = dateHi.getMonth();
  let guard = 0;
  while ((y < yEnd || (y === yEnd && m <= mEnd)) && guard < 400) {
    guard++;
    const dim = daysInMonth(y, m);
    const firstDay = new Date(y, m, 1), lastDay = new Date(y, m, dim);
    const D_first = dayIdx(firstDay) - dayIdx(anchorWeekStart);
    const D_last = dayIdx(lastDay) - dayIdx(anchorWeekStart);
    const rFirst = (dayIdx(startOfWeek(firstDay)) - dayIdx(anchorWeekStart)) / 7;
    const D3c = 7 * (rFirst + 2) + 3;
    const text = MF[m].toUpperCase() + ' ' + y;
    const labelW = ctx.measureText(text).width / lvl.cellW;
    const needW = Math.max(labelW, 1);
    const cand = [];
    for (let r = r0; r <= r1; r++) {
      const sy = HEADER + (r - state.camY) * lvl.rowH + lvl.rowH * 0.5;
      if (sy < HEADER + fs * 0.6 || sy > H - fs * 0.6) continue;
      const mLo = D_first - 7 * r, mHi = D_last - 7 * r;
      const vLo = Math.max(mLo, state.camX), vHi = Math.min(mHi, state.camX + visCols);
      if (vHi - vLo < needW) continue;
      const cLo = vLo + labelW / 2, cHi = vHi - labelW / 2;
      const pref = clamp(D3c - 7 * r, cLo, cHi);
      const dist = Math.abs(7 * r + pref - D3c);
      cand.push({ r, c: pref, dist, sy });
    }
    if (cand.length) {
      let minDist = Infinity;
      for (const cd of cand) if (cd.dist < minDist) minDist = cd.dist;
      ctx.fillStyle = rgbaOf(PAL.whiteRgb, 0.4);
      if (minDist < 0.5) {
        for (const cd of cand) {
          if (cd.dist <= minDist + 0.01) {
            const sx = GUTTER + (cd.c - state.camX) * lvl.cellW;
            ctx.fillText(text, sx, cd.sy + fs * 0.35);
          }
        }
      } else {
        let best = null;
        for (const cd of cand) if (!best || cd.dist < best.dist) best = cd;
        const sx = GUTTER + (best.c - state.camX) * lvl.cellW;
        ctx.fillText(text, sx, best.sy + fs * 0.35);
      }
    }
    m++; if (m > 11) { m = 0; y++; }
  }
  ctx.textAlign = 'left';
}

/**
 * Отрисовка режима «дни».
 */
export function renderMap() {
  ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, W, H);
  const lvl = VIEW;
  const gridH = H - HEADER, gridW = W - GUTTER;
  const r0 = Math.floor(state.camY) - 1, r1 = Math.ceil(state.camY + gridH / lvl.rowH) + 1;
  const k0 = Math.floor(state.camX) - 1, k1 = Math.ceil(state.camX + (W - GUTTER) / lvl.cellW) + 1;
  counters.cells = (r1 - r0 + 1) * (k1 - k0 + 1);
  ctx.save();
  ctx.beginPath(); ctx.rect(GUTTER, HEADER, gridW, gridH); ctx.clip();
  for (let r = r0; r <= r1; r++) { renderRowDays(r, HEADER + (r - state.camY) * lvl.rowH, lvl); }
  ctx.strokeStyle = PAL.gridLine;
  for (let r = r0; r <= r1; r++) {
    const y = HEADER + (r - state.camY) * lvl.rowH;
    ctx.beginPath(); ctx.moveTo(GUTTER, y + lvl.rowH + 0.5); ctx.lineTo(W, y + lvl.rowH + 0.5); ctx.stroke();
  }
  drawMonthFrames(r0, r1, lvl);
  drawMonthWatermarks(r0, r1, lvl);
  drawHoverOutline(lvl);
  drawTimeCursor(getEventBounds);
  ctx.restore();
  drawTopHeader(lvl);
  drawGutter(r0, r1, lvl);
  ctx.fillStyle = PAL.chrome; ctx.fillRect(0, 0, GUTTER, HEADER);
  ctx.fillStyle = PAL.textFaint; ctx.font = '9px ui-monospace,monospace';
  ctx.fillText('недели ↓', 8, HEADER / 2 + 3);
  ctx.strokeStyle = PAL.border;
  ctx.beginPath(); ctx.moveTo(0, HEADER + 0.5); ctx.lineTo(W, HEADER + 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(GUTTER + 0.5, 0); ctx.lineTo(GUTTER + 0.5, H); ctx.stroke();
}
