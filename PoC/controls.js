/**
 * controls.js
 * Панель управления: селектор даты, HUD, легенда, масштаб, выбор первого дня недели.
 */

import { bus, state, today, MF } from './core.js';
import { EVENTS, describe } from './events.js';
import { isSliderLocked } from './navigation.js';

function setDateSelector(d) {
  const navDay = document.getElementById('nav-day');
  const navMonth = document.getElementById('nav-month');
  const navYear = document.getElementById('nav-year');
  if (navDay) navDay.value = d.getDate();
  if (navMonth) navMonth.value = d.getMonth();
  if (navYear) navYear.value = d.getFullYear();
}

function readDateSelector() {
  const navDay = document.getElementById('nav-day');
  const navMonth = document.getElementById('nav-month');
  const navYear = document.getElementById('nav-year');
  const d = parseInt(navDay?.value, 10) || 1;
  const m = parseInt(navMonth?.value, 10) || 0;
  const y = parseInt(navYear?.value, 10) || today.getFullYear();
  return new Date(y, m, Math.min(d, new Date(y, m + 1, 0).getDate()));
}

function buildLegend() {
  const el = document.getElementById('legend');
  if (!el) return;
  for (const e of EVENTS) {
    const d = document.createElement('div');
    d.className = 'lg';
    d.innerHTML = `<div class="sw" style="background:${e.color}"></div>
      <div><div>${e.title} <small style="display:inline;color:var(--text-faint)">· ${e.plan}</small></div>
      <small>${describe(e)}</small></div>`;
    el.appendChild(d);
  }
}

function updateHud() {
  const anchor = document.getElementById('anchor');
  if (anchor) anchor.textContent = 'фокус: ' + MF[today.getMonth()] + ' ' + today.getFullYear();
  const helpEl = document.querySelector('.help');
  if (helpEl && !helpEl.querySelector('.debug-hint')) {
    const debugHint = document.createElement('div');
    debugHint.className = 'debug-hint';
    debugHint.style.marginTop = '6px';
    debugHint.style.color = 'var(--text-faint)';
    debugHint.textContent = 'F2 — оверлей отладки';
    helpEl.appendChild(debugHint);
  }
}

function updateModeDisplay() {
  const zoomPct = document.getElementById('zoomPct');
  if (zoomPct) zoomPct.textContent = Math.round(state.zoom * 100) + '%';
}

/**
 * Инициализация элементов управления.
 */
export function initControls() {
  buildLegend();
  updateHud();
  updateModeDisplay();

  const navDay = document.getElementById('nav-day');
  const navMonth = document.getElementById('nav-month');
  const navYear = document.getElementById('nav-year');
  const dateNavBtn = document.getElementById('date-nav-btn');

  // Заполнение месяцев
  if (navMonth) {
    MF.forEach((n, i) => { const o = document.createElement('option'); o.value = i; o.textContent = n; navMonth.appendChild(o); });
  }

  // Текущая дата
  if (navDay) navDay.value = today.getDate();
  if (navMonth) navMonth.value = today.getMonth();
  if (navYear) navYear.value = today.getFullYear();

  dateNavBtn.onclick = () => {
    const sel = readDateSelector();
    bus.emit('centerDate', sel);
  };
  dateNavBtn.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dateNavBtn.click(); }
  };
  [navDay, navMonth, navYear].forEach(el => {
    if (el) el.onkeydown = (e) => { if (e.key === 'Enter') dateNavBtn.click(); };
  });

  document.getElementById('gonow').onclick = () => { setDateSelector(today); bus.emit('goNow'); };
  document.getElementById('zoomPct').onclick = () => bus.emit('resetZoom');
  document.getElementById('zoom-in').onclick = () => bus.emit('zoomStep', 1);
  document.getElementById('zoom-out').onclick = () => bus.emit('zoomStep', -1);
  document.getElementById('zoom-in').ondblclick = () => bus.emit('zoomDbl', 1);
  document.getElementById('zoom-out').ondblclick = () => bus.emit('zoomDbl', -1);

  const sl = document.getElementById('zoomSlider');
  if (sl) {
    sl.addEventListener('input', () => {
      if (isSliderLocked()) return;
      bus.emit('setZoomFromSlider', parseFloat(sl.value));
    });
  }

  document.getElementById('fdowSelect').onchange = (e) => {
    state.firstDayOfWeek = e.target.value;
    bus.emit('requestRender');
  };

  document.getElementById('toggleHud').onclick = () => {
    const hud = document.getElementById('hud');
    hud.style.display = hud.style.display === 'none' ? '' : 'none';
  };

  // Подписка на события ядра
  bus.on('zoomUpdated', updateModeDisplay);
  bus.on('modeChanged', updateModeDisplay);
}
