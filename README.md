
  # Anv Checks

  A fast, local-first task manager — collections, kanban-style groups, subtasks, deadlines, streak metrics, and full offline persistence, all in a single-page app.

  ![status](https://img.shields.io/badge/status-active-2997ff)
  ![version](https://img.shields.io/badge/AnvCore-v4.5-2997ff)
  ![license](https://img.shields.io/badge/license-MIT-lightgrey)

---

## ✨ Features

- **Task management** — title, description, priority, due date, subtasks, auto-delete policy
- **Collections** — custom projects with name, color, and icon
- **Groups** — kanban-style columns, drag-and-drop reordering and reassignment
- **Views** — Inbox Feed, Today, Done Archive, Manage Studio, live Search
- **Multi-select** — drag-to-select tasks, bulk complete / delete / move
- **Context menus** — right-click actions on tasks, groups, and the feed
- **Custom calendar picker** — no native `<input type="date">` dependency
- **Workspace metrics** — 7-day streak tracker + completion percentage
- **Import / Export** — full JSON backup and restore
- **Responsive** — sidebar/inspector become full-screen drawers on mobile
- **Offline persistence** — everything saved to `localStorage`, synced across open tabs

## 🖥️ Tech Stack

- Vanilla HTML / CSS / JS — no framework, no build step required to run
- Tailwind CSS — **precompiled to static `output.css`** (not the CDN JIT script) for compatibility with older Android WebViews
- [Hugeicons](https://hugeicons.com) icons (stroked rounded style)

## 📂 File Structure

```
├── index.html      # markup + head links
├── styles.css      # custom CSS (non-Tailwind)
├── output.css      # precompiled Tailwind stylesheet
├── script.js       # app logic
└── favicon.png     # app icon
```

## 🚀 Getting Started

No build tools needed to run it — it's static.

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

Open `index.html` directly in a browser, or serve it locally:

```bash
npx serve .
```

### Rebuilding `output.css` after a Tailwind class change

```bash
npm install
npx tailwindcss -i input.css -o output.css --minify
```

## 🌐 Deployment

Deployed on [Vercel](https://vercel.com) — just point it at this repo. No environment variables or server config required; everything is static.

## 📱 Browser Support

Tested to render correctly on modern browsers **and** older Android WebViews (Android 9 and below), thanks to the precompiled CSS pipeline instead of a runtime CDN compiler.

## 📄 License

MIT
