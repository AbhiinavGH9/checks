# Anv Checks — Complete Application Overview & System Architecture

This document provides a comprehensive technical overview of **Anv Checks** for developers and users. It covers the overall application architecture, design system, core state management, priority auto-sorting engine, modal teardown, context menu mechanics, subtask threading, and Supabase multi-device sync protocols.

---

## 1. Executive Summary & Design Aesthetics

**Anv Checks** is a modern, high-performance task management web application crafted following Apple's photography-first, minimalist human interface guidelines (`DESIGN-apple.md`). UI chrome recedes into dark/light canvas backgrounds, prioritizing user tasks with clean typography, pill-shaped action containers, subtle glassmorphic blurs, and vibrant priority color swatches.

### Key Visual & Design Foundations
- **Color Palette & Themes**: Seamless Dark (`#0A0A0A` canvas) and Light (`#f5f5f7` canvas) themes powered by pure CSS custom variables. Theme toggle is located inside the top right three-dot menu options under the Account section.
- **Pill-Shaped Task Item Rows**: Tasks are displayed inside borderless, shadowless, pill-shaped rows (`.group-card`). Standard boxed borders and outer card containers are removed to maximize visual focus.
- **Subtask Threading**: Nested subtasks feature branching L-shaped curved line threads (`.subtask-thread-container`), providing a visual hierarchy similar to YouTube comment threads or Reddit reply trees.
- **Floating Header & Greeting Section**: Replaces traditional branded app headers with a clean top bar (`[Sidebar Toggle] | [Inbox Feed] [Action Button Groups]`). Below it, a dynamic date and greeting block displays the current date (e.g. `Sunday 2nd, August`) and user greeting (e.g. `Good evening, User`, `we've sorted everything for you`).
- **iOS 18 Glassmorphic Context Menus**: Context menus on mobile and desktop render with high-blur glassmorphic backdrop filters (`backdrop-filter: blur(25px)`), rounded corners, stacked pill actions, and icon indicators.

---

## 2. Core Architecture & File Structure

```
d:\Anv Checks\
├── index.html        # Single Page Application HTML shell, modals, and inspector layout
├── styles.css        # Core design system, OKLCH tokens, iOS glass context menu, subtask tree CSS
├── script.js        # Main application state, priority auto-sorter, drag engine, sync worker
├── output.css        # Processed utility classes
├── supabase.js      # Supabase client wrapper & API client
└── APP_OVERVIEW.md  # Comprehensive technical system documentation
```

---

## 3. Application State (`AppState`) Breakdown

The centralized state object `AppState` inside `script.js` manages all real-time client data:

```javascript
let AppState = {
    tasks: [],              // Array of task objects
    projects: [],           // Collections / Projects array
    groups: [],             // Group columns array
    currentTab: 'inbox',    // Current view: 'inbox', 'today', 'done', 'manage', 'search', or project ID
    selectedTaskId: null,   // Active task in Inspector side drawer
    selectedTaskIds: [],    // Multi-selected task IDs for batch context actions
    searchQuery: '',        // Global search query string
    sortBy: 'created',      // Current sort strategy: 'created', 'due', 'priority', 'alphabetical'
    sidebarCollapsed: false,// Collapsed state of left navigation panel
    pinnedTaskIds: [],      // Direct sidebar pinned task IDs
    counterTargetPolicy: 'tasks', // Badge count target: 'tasks' vs 'subtasks'
    session: null,          // Supabase Auth session token
    syncing: false          // Cross-device sync status flag
};
```

---

## 4. Priority Auto-Sorting Engine

The priority system is driven by a 12-rank color palette corresponding to the color swatches in the Task Details modal:

```javascript
const PRIORITY_LEVELS = [
  "red", "orange", "yellow", "green", "lightblue", "blue",
  "violet", "magenta", "purple", "beige", "gray", "lightpink"
];
```

### Rank Order & Priority Comparator
1. **Color Order**: `Red` (highest priority / Rank 0) down to `Light Pink` (lowest priority / Rank 11).
2. **Manual Reorder Overrides**: When a user arranges tasks using the manual reorder buttons, a `manualOrderIndex` is assigned to the task. Manual reorders stick and win over color rank.
3. **Color Update Reset**: Updating a task's priority color swatch clears `manualOrderIndex = null`, allowing the task to automatically drop back into its natural color rank position.

```javascript
function comparePriority(taskA, taskB) {
  if (taskA.manualOrderIndex != null && taskB.manualOrderIndex != null) {
    return taskA.manualOrderIndex - taskB.manualOrderIndex;
  }
  const rankA = PRIORITY_LEVELS.indexOf(taskA.priorityColor || taskA.color);
  const rankB = PRIORITY_LEVELS.indexOf(taskB.priorityColor || taskB.color);
  return (rankA === -1 ? 99 : rankA) - (rankB === -1 ? 99 : rankB);
}
```

---

## 5. Overlay Teardown & Backdrop Dimness Engine

To eliminate lingering dimness or backdrop artifacts on mobile and desktop, all modals, sidebars, drawers, and context menus route through a single dismiss engine (`dismissOverlay`):

```javascript
function dismissOverlay(backdropEl, containerEl) {
    if (!backdropEl) return;
    backdropEl.classList.remove('opacity-100');
    backdropEl.classList.add('opacity-0');
    if (containerEl) {
        containerEl.classList.add('scale-95');
    }
    setTimeout(() => {
        backdropEl.classList.add('hidden');
        backdropEl.style.pointerEvents = 'none';
    }, 150);
}
```

### Unsaved Changes Confirmation Modal
When a user clicks outside a modal (or presses close) while fields have been filled in, the app prompts a custom confirmation modal (`#confirmation-modal-backdrop`) featuring vertically stacked pill buttons (`Discard Changes`, `Keep Editing`).

---

## 6. Mobile Gesture & Touch Holding Interactions

1. **Touch Holding (Long Press)**: Holding down on any task row for `500ms` automatically triggers the iOS 18 glassmorphic context menu.
2. **Pull-to-Refresh Disabled**: Overscroll pull-to-refresh (`overscroll-behavior-y: contain`) is disabled to prevent accidental page reloads when pulling down modals or sheets.
3. **Drag & Drop Removed**: Manual drag-and-drop handles are removed in favor of clean touch arrangement buttons (`Move Up`, `Move Down`).

---

## 7. Cross-Device Synchronization Protocol (Supabase)

- **Offline-First & Local Storage**: Tasks, projects, groups, and user settings persist locally (`CLIPBOARD_TASKS_DATA_V3`).
- **Background Sync Queue**: Operations (`upsert`, `delete`) are logged into a local pending queue (`CLIPBOARD_PENDING_WRITES`). When online, `processSyncQueue()` syncs changes to Supabase Postgres tables.
- **Realtime Listener**: Postgres change feeds listen to `tasks`, `projects`, `groups`, and `profiles` for instantaneous cross-device state mirroring.
