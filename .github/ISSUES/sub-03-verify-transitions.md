### Verify transition coordinates (map ↔ timeline ↔ monthrow)
#### EN
Investigate and (if necessary) adjust the coordinate math used during mode transitions between map, timeline and month-row views.

Context:
The PoC implements multiple animated/instant transitions between modes (map, timeline, monthrow). Some transition branches use different offsets (e.g. sometimes using (mx-GUTTER) vs mx). Currently this flow works in practice, but needs explicit verification and small cleanup to ensure it remains correct after further changes.

What to do (necessary):
- Audit all transition functions: changeModeInstant, startTransitionToTimeline, startTransitionToMonthRow, startTransitionToMap.
- Ensure consistent use of "effective gutter" (timeline uses gutter=0) and document why that exception exists.
- Verify fractions used for restoring positions after transitions: compute and use fracX and fracY where appropriate.
- Add a small test script or reproducible manual checklist for QA to validate cursor-relative behaviour (e.g. place cursor on a date, switch mode and confirm same logical date stays under cursor).

What is desirable:
- Add inline comments explaining why (mx-GUTTER) is used in certain branches.
- Normalize helper code: create helper getEffectiveGutter(mode) and use it consistently.

Acceptance criteria:
- Transitions preserve the date under cursor (or behaviour matches documented UX) in manual QA scenarios.
- No regressions observed after small random pan/zoom transitions.

#### RU
### Проверка математики переходов (map ↔ timeline ↔ monthrow)
Проверить и при необходимости уточнить математику координат, используемую при переходах между режимами map, timeline и monthrow.

Контекст:
PoC реализует несколько переходов между режимами (с анимацией или мгновенно). В некоторых ветках используются разные смещения (например, иногда используется (mx-GUTTER), а иногда просто mx). На практике текущее поведение работает, но требуется явная проверка и небольшая очистка кода, чтобы оно оставалось корректным при дальнейших изменениях.

Что необходимо сделать:
- Провести аудит всех функций перехода: changeModeInstant, startTransitionToTimeline, startTransitionToMonthRow, startTransitionToMap.
- Обеспечить консистентное использование «эффективного» gutter (timeline использует gutter=0) и задокументировать причину этого исключения.
- Провести проверку частей с fracX и fracY — корректно ли используются обе дробные компоненты при восстановлении позиции.
- Добавить небольшой тестовый скрипт или чеклист для ручного QA, чтобы воспроизводимо проверить поведение (например: поставить курсор на дату, сменить режим и убедиться, что та же логическая дата остаётся под курсором).

Что желательно:
- Добавить комментарии в код, поясняющие использование (mx-GUTTER) в конкретных ветках.
- Нормализовать код через helper getEffectiveGutter(mode) и использовать его повсеместно.

Критерии приёмки:
- Вручную проверенные переходы сохраняют дату под курсором (или поведение соответствует описанному UX).
- Нет регрессий при случайных панорамах/зумах.