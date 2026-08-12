### Epic: PoC (POC.html) — Critical fixes, date/time correctness, performance and architecture
#### EN


This epic groups work to stabilize the PoC (POC.html): fix runtime errors and transition edge-cases, make date calculations robust (UTC-based day indices), optimize hot rendering paths where needed, add a minimal set of tests for critical date/event logic, and prepare the codebase for a future refactor and documentation phase once UX is validated.

Main goals / scope:
- Fix blocking runtime issues and obvious logic bugs
- Make date computations robust and DST-safe (use UTC-based day indices)
- Reduce unnecessary allocations in hot paths where it matters (profile-driven)
- Add a minimal set of unit tests for date and event utilities
- Prepare a clear plan for later refactor (module split, docs, build/test)

Checklist:
- [ ] Create sub-issues for blockers, correctness, perf, tests, refactor, accessibility and UI polish
- [ ] Fix ReferenceError / function name inconsistencies (monthrow/monthRowDate)
- [ ] Verify transition math (timeline ↔ map ↔ monthrow) and only change if needed
- [ ] Migrate dayIdx/dateFromDayIdx to UTC-based implementation and add tests
- [ ] Cache expensive computations in hot loops where profiling shows impact
- [ ] Add basic unit tests for occursOn and date utilities
- [ ] Document plan for post‑PoC refactor (modules, API, build/test)

Suggested labels: epic, priority:high, enhancement

#### RU
### Epic: PoC (POC.html) — критические исправления, корректность дат/времени, производительность и архитектура


Этот epic объединяет работу по стабилизации PoC (POC.html): исправление runtime‑ошибок и пограничных багов переходов, переход к корректным вычислениям дат (UTC), оптимизация горячих путей рендера там, где это действительно нужно, добавление минимального набора тестов для критичных утилит и подготовка к рефакторингу/документации после валидации UX.

Чеклист:
- [ ] Завести под‑задачи для багов, корректности, perf, тестов, рефактора, доступности и UI‑полировки
- [ ] Исправить ReferenceError / несоответствие имён функций (monthrow/monthRowDate)
- [ ] Проверить математику переходов (timeline ↔ map ↔ monthrow) и менять только при необходимости
- [ ] Перевести dayIdx/dateFromDayIdx на UTC и добавить тесты
- [ ] Кешировать дорогие вычисления в горячих циклах, если профилинг подтвердит проблему
- [ ] Добавить простые unit‑тесты для occursOn и date utilities
- [ ] Подготовить план пост‑PoC рефакторинга (модули, API, сборка/тесты)

Рекомендованные метки: epic, priority:high, enhancement