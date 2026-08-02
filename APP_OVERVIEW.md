# APP_OVERVIEW.md — Complete Anv Checks System Guide

Welcome to **Anv Checks**. This document provides an exhaustive, ground-up guide to the product architecture, user flows, visual design language, and technical codebase.

---

## 1. Product Overview

### What is Anv Checks?
**Anv Checks** is a modern, high-performance web application designed for personal task management, collection organization, and productivity workflows. It operates as a local-first application with optional cloud multi-device synchronization powered by Supabase.

### Who is it for?
It is built for individuals and power users who need high-density, low-friction task tracking with visual priority management, subtask nesting, custom group columns, and instant cross-device access.

### Core User Flows
1. **Task Creation**: Users hit `+` or `New Task` to open the task creation modal. They supply a title, optional notes, subtasks, target collection, due date, priority color swatch, and icon glyph.
2. **Organization**: Tasks live within **Groups** (e.g. "Editing", "In Progress", "Done") and **Collections** (e.g. Work, Personal). Tasks can be moved across groups or auto-sorted by priority color rank.
3. **Detail Inspector**: Clicking a task row opens the Inspector drawer/sheet, allowing real-time edits to notes, nested subtasks, priority swatches, icon glyphs, deadlines, auto-deletion rules, and auto-delete holds.
4. **Settings & Themes**: Through the floating bar's three-dots options menu, users can toggle instantly between Dark Mode and Light Mode with persisted user preference.

---

## 2. Feature Inventory

- **Flat Pill Task Rows**: Task items display as borderless flat surfaces with fully rounded pill edges for hover/select feedback (`rounded-full`), keeping UI clean and clutter-free without card box shadows.
- **Top Floating Action Bar**: Detached top floating bar hosting sidebar collapse toggle, Inbox/Feed view switcher, action buttons (New Task, Add Group, View Toggle, Search, Sort), shortened `N active` badge, and three-dots settings menu.
- **Date & Greeting Header**: Prominently displays the full ordinal date (e.g., `Sunday 2nd, August`) above a time-computed greeting (`Good morning / afternoon / evening / night, [Name]`) and tagline (`We've sorted everything for you`).
- **Settings Section**: Embedded in the three-dots dropdown menu, offering instantaneous, app-wide Light / Dark mode switching.
- **Unsaved Changes Guard**: Every modal/sheet interception (via backdrop click, ✕ button, Esc key, or drag-to-dismiss) evaluates whether input fields are dirty and prompts inline (`Discard changes?` with `Keep editing` / `Discard`).
- **Subtask Reply Threads**: Subtasks render as branching reply threads under their parent task using connector elbows (`└─`).
- **iOS-Style Mobile Context Menus**: Long-press on mobile tasks or groups triggers a compact, rounded rectangle popup anchored to the touch location with background blur and scale-in animation.
- **12-Color Priority Auto-Sorting**: Auto-sorts tasks according to a fixed rank hierarchy:
  `red > orange > yellow > green > light blue > blue > violet > magenta > purple > beige > gray > light pink`. Manual reordering sticky overrides persist until a task's color swatch is changed again.
- **Disabled Mobile Pull-to-Refresh**: Top-level `html, body { overscroll-behavior-y: none; }` prevents native browser refresh conflicts while preserving smooth bottom sheet drag-to-dismiss gestures.

---

## 3. Data Model

### `Task` Entity
| Field | Type | Description |
|---|---|---|
| `id` | string | Unique timestamp-based identifier (e.g., `task-1722617000`) |
| `title` | string | Task title text |
| `description` | string | Extended task notes/description |
| `color` / `priorityColor` | string | Hex or named priority color (e.g. `#FF3B30`, `red`) |
| `manualOrderIndex` | number \| null | Manual override index set via reorder buttons (cleared on color change) |
| `dueDate` | string \| null | ISO date string (`YYYY-MM-DD`) |
| `projectId` | string \| null | ID of parent collection |
| `groupId` | string \| null | ID of target group column |
| `icon` | string | Glyph icon identifier |
| `done` | boolean | Completion status |
| `subtasks` | Array<Subtask> | List of nested subtask items |
| `notes` | Array<Note> | List of short yellow pill notes |
| `autoDelete` | string | Auto-deletion policy (`default`, `never`, `1day`, `1week`, `custom`) |
| `holdDeletion` | boolean | Toggle pausing automatic deletion |

---

## 4. Core Systems Explained Plainly

### Sheet & Modal System
Modals and sheets feature double-layered overlays. Touch and pointer gestures track drag distance (`translateY` for bottom sheets, `translateX` for side drawers). On dismiss, `cleanupOverlayBackdrop` smoothly fades opacity to `0`, sets `pointer-events: none`, and unmounts nodes.

### Unsaved Changes Guard System
When a modal opens, input fields track their initial state. All close triggers route through `requestClose({ isDirty, onConfirmNeeded, onClose })`. If dirty, an inline banner injects into the header for user confirmation without opening redundant modal dialogs.

### Priority & Sorting System
Tasks in group sections are sorted dynamically by `comparePriority(taskA, taskB)`. If `manualOrderIndex` is non-null on both tasks, manual placement is preserved. Otherwise, tasks sort by `PRIORITY_LEVELS` rank index. Calling `setTaskPriority(task, newColor)` resets `manualOrderIndex` to `null`, allowing the task to drop into its color rank position.

---

## 5. Design System

- **Pill Shape Task Surfaces**: Individual task rows avoid card boundaries, borders, or filled card rectangles. Hover and touch feedback are provided by a flat rounded pill shape (`rounded-full`).
- **No Box Shadows**: `box-shadow` is excluded across task rows and standard card components to preserve flat design aesthetics.
- **Priority Palette**: 12 curated swatches (`red`, `orange`, `yellow`, `green`, `lightblue`, `blue`, `violet`, `magenta`, `purple`, `beige`, `gray`, `lightpink`).
- **Typography Scale**: Built on `Plus Jakarta Sans` with monospace elements for metrics and badges.

---

## 6. File & Component Map

- [`index.html`](file:///d:/Anv%20Checks/index.html): HTML structure containing floating top action bar, greeting block, main task feed container, modals, Inspector sheet, and context menu definitions.
- [`styles.css`](file:///d:/Anv%20Checks/styles.css): Core design system, OKLCH dark/light CSS variables, button group styles, iOS context menu animations, and `overscroll-behavior-y: none`.
- [`script.js`](file:///d:/Anv%20Checks/script.js): Application logic, AppState store, local storage persistence, Supabase sync workers, task rendering, priority auto-sort, and gesture controllers.
- [`TASKS.md`](file:///d:/Anv%20Checks/TASKS.md): Sequential task completion checklist.

---

## 7. Known Constraints & Architectural Decisions

1. **No Drag-and-Drop List Reordering**: List drag-and-drop is intentionally excluded; reorder buttons handle manual list positioning.
2. **Preserved Sheet Drag-to-Dismiss**: Bottom sheet and drawer swipe-to-dismiss gestures are maintained.
3. **No Unrequested Shadows**: Box shadows on standard surfaces are disabled by design.
