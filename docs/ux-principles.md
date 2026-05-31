# Konektado UX Principles

Konektado is a mobile-first barangay job-matching app for residents, clients, and barangay staff with varying digital literacy. UI decisions should prioritize clarity, trust, low cognitive load, and guided completion over feature density.

## Core UX Rules

1. Avoid asking the same concept twice.
   If a value already exists in one step, do not repeat it as a chip, toggle, helper text, or advanced option elsewhere.

2. One concept should have one home.
   Schedule flexibility belongs in the schedule step.
   Experience and certificate preferences belong in advanced job requirements.
   Quick tags should only describe worker-scannable job expectations.

3. Prefer progressive disclosure.
   Show common fields first.
   Hide advanced or less-used settings inside collapsible sections such as “More options.”

4. Avoid redundant headings.
   Do not repeat a page title as a section title directly below it.

5. Use plain human labels.
   Prefer “Can coordinate” over “Flexible schedule.”
   Prefer “Must be this time” over “Fixed schedule.”
   Prefer “Set exact time” over “Exact time needed.”

6. Remove conflicting states.
   Do not let users select Morning while also setting an exact time that belongs to Evening.
   If exact time is selected, infer the time block automatically.

7. Make the default path simple.
   The user should be able to complete a job post without opening advanced options.

8. Keep mobile touch targets accessible.
   Chips, buttons, inputs, and toggles should be easy to tap on small Android screens.

9. Preview important choices.
   Use short preview cards for schedules, budgets, and other important posting details.

10. Do not make internal logic visible unless it helps the user.
   Store technical values internally, but show simple user-facing labels.

   ## Smart Mobile Interaction Patterns

Konektado should not default to plain text inputs, toggles, or long forms when a more natural mobile interaction exists. Before implementing a UI field, decide whether the user task is better served by a picker, slider, chip group, swipe action, bottom sheet, segmented control, stepper, or preview card.

### Prefer task-based controls over raw inputs

Use controls that match the task:

- Price or rate range → range slider, with optional min/max text fields only when precision is needed.
- Worker count → stepper or picker, not free typing.
- Category selection → grouped chips or searchable picker, not plain text.
- Location/barangay → picker or saved location option, not repeated manual typing.
- Date/time → date picker, time picker, or simple time block chips.
- Experience level → chips or segmented control.
- Yes/no preference → switch only when the setting is truly independent.
- Multiple quick job traits → chips with a clear selection limit.
- Long advanced settings → collapsible “More options” section.
- Chat row actions → swipe actions for Archive, Delete, Mute, Mark as unread.
- Destructive actions → confirmation sheet or undo snackbar.
- Repeated choices → remember recent selections when safe.

### Avoid lazy form design

Do not use a text input just because it is easy to implement. Text inputs should be used when the user must enter custom information, such as job description, message content, name, or notes.

For structured values, use structured controls.

Bad:
- Min rate text field
- Max rate text field
- Workers needed text field
- Barangay text field
- Experience text field

Better:
- Rate range slider
- Worker count picker
- Barangay picker
- Experience chips
- Category chips

### Use mobile gestures where they reduce friction

For lists such as chats, saved posts, notifications, or applications, use common mobile gestures when appropriate:

- Swipe chat left: Archive, Delete
- Swipe chat right: Mark as unread or Pin
- Long press item: open quick action sheet
- Pull to refresh: refresh lists
- Tap card: open details
- Press and hold image: preview or manage image

Gesture actions must not be the only way to access important actions. Also provide a visible overflow menu or action sheet for accessibility and discoverability.

### Use sliders carefully

Use sliders when users are choosing a range visually, such as:

- Budget range
- Rate filter
- Distance radius
- Availability window

Rules:
- Show live values above or inside the slider.
- Allow reasonable presets when possible.
- Use step increments that make sense, such as ₱50 or ₱100.
- Do not require exact dragging for precise values.
- If exact precision matters, include optional min/max fields below the slider.

Example:
Rate range
₱300 – ₱1,500

[ range slider ]

Optional:
Min ₱300    Max ₱1,500

### Use swipe actions carefully

Swipe actions are good for secondary actions, not primary actions.

Good swipe actions:
- Archive chat
- Delete chat
- Mute chat
- Mark as unread
- Save/unsave post

Avoid hiding critical primary actions only behind swipe gestures.

Rules:
- Destructive actions like Delete should require confirmation or support undo.
- Swipe actions should use clear icons and labels.
- Keep actions limited to 2–3 per row.
- Make sure there is also an accessible menu alternative.

### Prefer progressive disclosure

Do not show all controls at once. Start with the common path, then reveal advanced options only when needed.

Examples:
- Job post: show title, category, date, budget first.
- Hide certificates, auto-reply, auto-close, and advanced requirements under “More options.”
- Search filters: show most-used filters first, advanced filters later.
- Profile editing: show public info first, private/account info separately.

### Reduce cognitive load

Before finalizing a UI, check:

1. Is the same concept shown twice?
2. Can this text input become a picker, chip, slider, or stepper?
3. Can this advanced option be hidden until needed?
4. Can the app infer this value automatically?
5. Can the user understand the screen in 5 seconds?
6. Are labels human, not technical?
7. Are destructive actions protected?
8. Is the mobile interaction familiar?