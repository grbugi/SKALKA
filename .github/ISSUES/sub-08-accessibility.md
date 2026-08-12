### English title
#### EN
Accessibility: Keyboard navigation, ARIA and contrast checks

Context:
There is already an issue for controls. This issue supplements it with concrete steps and accessibility checklist relevant to PoC controls and UI.

What to do (recommended):
- Add aria-label/role to interactive elements (#toggleHud, #gonow, #zoom-in/out, date navigation controls).
- Ensure focusable controls have visible focus styles and tabindex where needed.
- Implement keyboard handling for main flows: arrow keys for panning, +/- for zoom, 0 for center, Enter/Space for buttons.
- Check contrast of text and highlight colors against WCAG AA and adjust opacities if needed.
- Document keyboard shortcuts in the HUD help area.

Acceptance criteria:
- Controls have aria attributes; keyboard navigation covers main flows; basic contrast check performed and adjustments made where needed.

#### RU
### Русский заголовок
Доступность: клавиатурная навигация, ARIA и проверка контраста

Контекст:
Уже есть отдельный issue по управлению — этот дополняет его конкретными шагами по доступности.

Что сделать (рекомендуется):
- Добавить aria-label / role для интерактивных элементов (#toggleHud, #gonow, #zoom-in/out, навигация по дате).
- Обеспечить видимый фокус и tabindex для контролов.
- Реализовать keyboard shortcuts: стрелки — панорама, +/- — зум, 0 — центр, Enter/Space — кнопки.
- Проверить контраст текста и подсветок по WCAG AA и при необходимости повысить opacity или изменить цвета.
- Добавить краткую подсказку с горячими клавишами в HUD.

Критерии приёмки:
- ARIA добавлена; основные сценарии доступны с клавиатуры; контраст проверен.
