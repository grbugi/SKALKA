# SKALKA — The Scalable Calendar
## AI Agent Reference Guide

> **Context for AI Agents:** This file provides full project context — architecture, data model, UX, and constraints. Read this before modifying code or proposing features.

---

## 1. Project Overview

**SKALKA** is a visual calendar with an infinite 2D interface that turns time planning into navigation across an interactive map. It solves the "patchwork" problem of classic calendars (Day/Week/Month tabs) by unifying the time flow on a single plane.

**Core goal:** Avoid scheduling conflicts, control intervals, and perceive time as rhythm.
**License:** GNU AGPL-3.0. All dependencies must be AGPL-compatible.

---

## 2. Core Concept

Time flows **linearly** (it moves forward), but its measurement and structuring fit into **cyclical patterns** (weeks, months, years). SKALKA maps linear time onto a cyclical 2D scalable structure.

| View | Zoom Range | Purpose |
| :--- | :--- | :--- |
| **Months** | 25%–50% | Macro overview: month = row, columns = weekdays |
| **Days** (Map) | 50%–1000% | Primary scalable time map |
| **Hours** (Timeline)| 1000%–2500% | Micro-planning: continuous event flow |

**Transitions:** Handled via a **3-scroll barrier** at zoom thresholds (400ms cross-fade). Cursor position is preserved.

---

## 3. Target Audience

| Segment | Use Cases |
| :--- | :--- |
| **Primary:** Sysadmins, DevOps, dispatchers | Backups, maintenance windows, avoiding overlaps, handling cross-midnight events (23:30→01:00) |
| **Secondary:** Shift managers, researchers | Fixed periodic tasks, repetitive process analysis |

---

## 4. Current PoC Implementation

The PoC lives in the `PoC/` folder as a modular single-page application. 
**Implemented:**
- 3 views with smooth transitions and 3-scroll barriers.
- Week seams (Sun→Mon or Sat→Sun based on user toggle, default is Mon).
- Month gradients (odd: purple, even: teal→white) and watermarks.
- Coordinate highlighting on hover.
- Events as horizontal bars flowing across midnight.
- Logarithmic zoom slider.

---

## 5. Architecture and Data Model

### Entity Model
An `Event` is a first-class entity that can be either a **recurring template** or a **single standalone instance**.

| Field | Type | Purpose |
| :--- | :--- | :--- |
| `starts_at` | ISO-8601 | **Mandatory anchor.** The event does not exist before this moment. |
| `repeat_until` | ISO-8601 | Optional boundary. Recurrence stops here. Indefinite if null. |
| `is_template` | boolean | `true` = recurring rule, `false` = single instance. |
| `title`, `color` | string | Visualization and identification. |
| `duration_minutes`| int | Duration (1–40320). |

### Instance Generation
- **Single events:** Stored directly as instances.
- **Recurring events:** Only the template + `starts_at` + `repeat_until` are stored. Individual occurrences are **computed on-the-fly** based on the visible viewport. Never store computed instances in the database.

---

## 6. Recurrence System

Instead of standard `RRULE`, SKALKA uses five independent, explicit systems:

| Type | Fields | Example |
| :--- | :--- | :--- |
| **Interval** | `interval` + `interval_unit` | Every 3 days (`interval=3`, `unit=days`) |
| **Week-row** | `week-row` (1-6, **0=last**) + `weekday` (1-7) | 3rd week, Tuesday (`row=3`, `day=2`) |
| **Weekday-order** | `weekday-order` (1-5, **0=last**) + `weekday` | Last Sunday (`order=0`, `day=7`) |
| **Absolute-date** | Day of month | Every 10th |
| **Classic weekly** | Fixed `weekday` | Every Friday |

*Note: `0` is strictly reserved for the "last" occurrence in a month (e.g., last week, last Friday).*

---

## 7. Language & Localisation Policy

### Documentation
Maintain in **both Russian and English**.

### User Interface & Defaults
Priority: **Russian (1)**, English (2).
The primary target locale is **Russian (ru-RU)**. Until explicit i18n work begins, hard-code these conventions as strict defaults:

| Parameter | Value |
| :--- | :--- |
| Time format | 24-hour (`HH:MM`) |
| Date format | `ДД.ММ.ГГГГ` (DD.MM.YYYY) |
| First day of week | **Monday** (ISO-8601) |
| Decimal separator | **Comma** (`,`) |
| Week numbering | ISO-8601 |

*User toggles (e.g., Sunday-first) are permitted for UX, but Monday/24h/DD.MM.YYYY must remain the hard fallback.*

---

## 8. API Contract (Planned)

The API is **Full CRUD** (not read-only).

### Capabilities
| Operation | Description |
| :--- | :--- |
| **Next occurrence** | Return single next occurrence of an event. |
| **Schedule for period**| Return all computed instances within a range (e.g., `from=...&to=...`). |
| **Mutations** | `POST` (Create), `PUT/PATCH` (Edit), `DELETE` (Delete). |

### Payloads
- All timestamps: **ISO-8601 with timezone** (e.g., `2026-08-12T00:00:00+03:00`).
- Display formatting (DD.MM.YYYY) is a frontend presentation concern, not an API one.

---

## 9. Coding & Style Rules

### Time Philosophy
Respect both aspects:
1. **Linear axis** for ordering, `starts_at`, `repeat_until`.
2. **Cyclical structures** for recurrence rules and visual grids.
*Do not model time as purely cyclical or purely linear without cycles.*

### Constants & Comments
**No magic numbers.** Every numeric or string constant must be named and accompanied by a brief comment.
```javascript
// ❌ Bad
if (day > 5) { … }

// ✅ Good
const WEEKDAY_SATURDAY = 6; // ISO-8601: Saturday
if (day >= WEEKDAY_SATURDAY) { … }
```

### Analogies
Welcome **only** when they clarify genuinely complex low-level mechanisms. Do not pad explanations with unnecessary metaphors.

---

## 10. What NOT to Do

| # | Prohibition | Reason |
| :--- | :--- | :--- |
| 1 | Revert the PoC back to a single file | The PoC is intentionally split into modules under `PoC/`. |
| 2 | Introduce Docker, Caddy, OAuth2, reverse proxies | Self-hosted/enterprise tooling begins ONLY after mobile apps are shipped. |
| 3 | Store recurring occurrences in DB | Compute them on-the-fly from template + `starts_at` + `repeat_until`. |
| 4 | Use English-first UI strings | Russian is the primary locale. |
| 5 | Use 12h format, MM/DD/YYYY, Sunday-first defaults | Violates strict `ru-RU` / ISO-8601 fallback policy. |
| 6 | Use magic numbers | Every constant must be named and commented. |
| 7 | Use AGPL-incompatible libraries | Includes proprietary code, RSALv2/SSPLv1 (e.g., Redis ≥7.4, MongoDB). Use Valkey/PostgreSQL instead. |

---

## 11. Tech Stack & Licensing

**License:** GNU AGPL-3.0. Network use triggers copyleft obligations.

| Component | Technology | AGPL Compatible | Notes |
| :--- | :--- | :--- | :--- |
| Frontend | React + Canvas/PixiJS | ✅ (MIT) | PixiJS for WebGL performance |
| Backend | Python FastAPI | ✅ (MIT) | Async, OpenAPI |
| Database | PostgreSQL | ✅ (PostgreSQL) | JSONB, FTS |
| Cache/Queue | **Valkey** | ✅ (BSD) | **Drop-in replacement for Redis ≥7.4** |
| Web Server | Caddy / nginx | ✅ (Apache/BSD) | Reverse proxy |

*Conflicts: Redis (≥7.4), MongoDB, Elasticsearch are strictly prohibited due to SSPL/RSALv2.*

---

## 12. File Structure

### Current (Active)
| File / Folder | Role |
| :--- | :--- |
| `README.md` | Human-facing overview |
| `README_AI.md` | This file |
| `LICENSE` | AGPL-3.0 |
| `PoC/` | **Active development target** — modular single-page PoC |
| `PoC/index.html` | Entry point (HTML structure + module loader) |
| `PoC/styles.css` | CSS variables, fonts, shadows, transitions |
| `PoC/core.js` | Shared state, constants, calendar math, dispatcher, common render helpers |
| `PoC/events.js` | Demo event data + `occursOn` / `describe` API |
| `PoC/mode-days.js` | «Days/Map» view renderer |
| `PoC/mode-hours.js` | «Hours/Timeline» view renderer |
| `PoC/mode-months.js` | «Months» view renderer |
| `PoC/navigation.js` | Zoom, mode transitions, cross-fade, go-now/center-date |
| `PoC/controls.js` | HUD, date selector, legend, buttons, slider bindings |
| `PoC/app.js` | Entry module: wires modules, input, render loop |

### How to run
Open `PoC/index.html` in a modern browser (ES6 modules must be loaded over `http/https`, so use any static server, e.g. `python -m http.server 8000`, and open `http://localhost:8000/PoC/index.html`).

### Target (Future — DO NOT CREATE YET)
```text
skalka/
├── src/          (core, api, ui, mobile)
├── tests/
├── i18n/         (ru.json, en.json)
└── deploy/       (Docker, Caddy — ONLY after mobile apps)
```

---

## 13. Glossary (Russian ↔ English)

### Views
| Russian Term | English Term | Description |
| :--- | :--- | :--- |
| «карта» / «дни» | Map / Days | Primary view. Rows = weeks, columns = weekdays. Zoom: 50%–1000%. |
| «таймлайн» / «часы» | Timeline / Hours | Single active row with a large time scale. Zoom: 1000%–2500%. |
| «месяцы» (monthrow) | Months (month-row) | Macro view. Rows = months, cells = days. Zoom: 25%–50%. |

### Geometry & Model
| Russian Term | English Term | Description |
| :--- | :--- | :--- |
| геликоид | Helicoid | Base time model: a 1D date ribbon folded into rows (clarified from "toroidal spiralite"). |
| развёртка | Unwrap / Projection | 2D representation of the helicoid on a flat plane. |
| несущая сетка | Carrier Grid | Periodic background grid (60 min / 24 h / 7 days / weeks of month). |
| сквозная проекция | Through-Projection | Dates "pierce" the grid without being a structural part of it. |
| фолдинг | Folding | Wrapping the 1D ribbon into rows (e.g., 7 days per row in "Days" view). |
| шов (=рубеж) | Seam | Vertical week boundary: Sun→Mon (if Monday-first) or Sat→Sun (if Sunday-first). |
| правое воскресенье | Right Sunday | Sunday closing a week that contains the 1st of the month (base for Monday-first layout). |
| левое воскресенье | Left Sunday | Sunday opening a week that contains the 1st of the month (base for Sunday-first layout). |
| дрейф дат | Date Drift | Diagonal shift of the 1st day of the month across weekdays. |
| строка / колонка / ячейка | Row / Column / Cell | Week/Month/Active Row; Weekday; Day/Day-of-Month. |
| гуттер | Gutter | Left sidebar containing week/month labels. |
| шапка | Header | Top panel containing weekday names. |

> **Geometry Note:** At 100% zoom, cells are strictly square (150×150 px). As zoom increases, width scales 15–30× faster than height. Horizontal and vertical scaling are intentionally non-uniform.

### Zoom & Navigation
| Russian Term | English Term | Description |
| :--- | :--- | :--- |
| порог | Threshold | View boundary: 50% (Months↔Days) or 1000% (Days↔Hours). |
| барьер | Barrier | Requires 3 scroll events past a threshold to trigger a view switch. |
| ступени | Steps | Discrete zoom values used by the -/+ buttons. |
| лог-слайдер | Log-Slider | Logarithmic zoom slider divided into 3 equal segments (Months/Days/Hours). |
| кросс-фейд | Cross-Fade | Transition effect between views (snapshot with fading alpha). |
| якорь (`anchorWeekStart`) | Anchor | Current week's Monday; the grid's origin point. |
| месяц-ориентир (`orientMonth`) | Reference Month | The specific month captured/focused when entering the "Months" view. |
| активная строка (`activeRow`)| Active Row | The single visible row in the "Hours" view. |

### Highlighting & Cursor
| Russian Term | English Term | Description |
| :--- | :--- | :--- |
| подсветка координат | Coordinate Highlight | On cell hover: highlights column + row + month, plus corresponding gutter/header. |
| месяц между швами | Month Between-Seams Highlight | Highlights all days of the cursor's month strictly between the nearest vertical seams in "Days" ("map") View. Like in classic calendar.|
| красная полоска | Red Line | Visual marker for the current time ("Now"). |
| курсор времени | Time Cursor | Thin vertical line under the mouse pointer displaying the exact time label. |
| прилипание (snap) | Snap | Time cursor magnetic attraction to event boundaries (20px radius). |

### Data
| Russian Term | English Term | Description |
| :--- | :--- | :--- |
| шаблон (`EventTemplate`) | Template | An event definition containing recurrence logic. |
| инстанс | Instance | A single occurrence computed on-the-fly from a template. |
| план | Plan | Logical grouping or category for events. |
| недельная строка (`week-row`) | Week-Row | Recurrence based on the wall-calendar week number. |
| порядок дня (`weekday-order`)| Weekday-Order | Recurrence based on ordinal weekday (e.g., "1st Monday"). |
| первая неделя месяца | First Week | The week containing the 1st day of the month. |
| последняя неделя (`week=0`) | Last Week | The final week of the month (represented as `0` in rules). |
| точка отсчёта (`firsttime`) | Origin Point | The first historical date/time the recurrence started. |
| водяной знак | Watermark | Large text label of the month rendered in the center of the month block. |
---
*For human-facing overview, see `README.md`.*
