/**
 * events.js
 * Единый интерфейс для получения данных о событиях.
 * Демо-данные загружаются из events.json; позже источник может быть заменён на API/DB.
 */

import {
  PAL, dayIdx, dowMon0, daysInMonth, addDays, FIRSTTIME,
  DW, mm
} from './core.js';

export const EVENTS = [];

/**
 * Загружает события из JSON и резолвит цвета через PAL.
 */
export async function loadEvents() {
  const res = await fetch('./events.json');
  const data = await res.json();
  EVENTS.length = 0;
  for (const e of data) {
    EVENTS.push({
      ...e,
      color: cssColorOfVar(e.colorVar) || PAL.white
    });
  }
}

function cssColorOfVar(varName) {
  if (!varName) return null;
  const key = varName.replace(/^--/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return PAL[key] || null;
}

/**
 * Проверяет, происходит ли событие e в указанную дату date.
 */
export function occursOn(e, date) {
  const y = date.getFullYear(), m = date.getMonth(), d = date.getDate(), dw = dowMon0(date);
  switch (e.type) {
    case 'daily': return true;
    case 'weekly': return dw === e.day;
    case 'interval': return (((dayIdx(date) - dayIdx(FIRSTTIME)) % e.n) + e.n) % e.n === 0;
    case 'week-row': {
      if (dw !== e.day) return false;
      const dim = daysInMonth(y, m);
      const fs = 7 - dowMon0(new Date(y, m, 1));
      const lm = dim - dowMon0(new Date(y, m, dim));
      let seg;
      if (d <= fs) seg = { num: 1, last: false };
      else if (d >= lm) seg = { num: 0, last: true };
      else seg = { num: 2 + Math.floor((d - fs - 1) / 7), last: false };
      return e.week === 0 ? seg.last : seg.num === e.week;
    }
    case 'weekday-order': {
      if (dw !== e.day) return false;
      const occ = Math.floor((d - 1) / 7) + 1;
      const f = 1 + ((dw - dowMon0(new Date(y, m, 1)) + 7) % 7);
      const tot = Math.floor((daysInMonth(y, m) - f) / 7) + 1;
      return e.ord === 0 ? occ === tot : occ === e.ord;
    }
  }
  return false;
}

/**
 * Возвращает человекочитаемое описание правила события.
 */
export function describe(e) {
  switch (e.type) {
    case 'daily': return `ежедневно ${mm(e.start)} · ${e.dur}м`;
    case 'weekly': return `каждый ${DW[e.day]} ${mm(e.start)} · ${e.dur}м`;
    case 'interval': return `каждые ${e.n}д ${mm(e.start)} · ${e.dur}м`;
    case 'week-row': return `${e.week === 0 ? 'последняя' : e.week}-я нед, ${DW[e.day]} ${mm(e.start)} · ${e.dur}м`;
    case 'weekday-order': return `${e.ord === 0 ? 'последний' : e.ord}-й ${DW[e.day]} ${mm(e.start)} · ${e.dur}м`;
  }
}

/**
 * Возвращает массив границ событий для указанной даты (для snap времени).
 */
export function getEventBounds(date) {
  const b = [];
  for (const e of EVENTS) {
    if (occursOn(e, date)) { b.push(e.start); const en = e.start + e.dur; if (en < 1440) b.push(en); }
    if (occursOn(e, addDays(date, -1))) { const en = e.start + e.dur; if (en > 1440) b.push(en - 1440); }
  }
  return b;
}

/**
 * Публичный API для получения всех событий.
 */
export function getEvents() { return EVENTS; }

/**
 * Поиск события по идентификатору.
 */
export function getEventById(id) { return EVENTS.find(e => e.id === id); }
