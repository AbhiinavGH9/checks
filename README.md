# Anv Checks

A sleek, dark-themed task management app built with plain HTML, CSS, and JavaScript. No frameworks, no build step — just static files.

---

## Project Structure

```
Anv Checks/
├── index.html    ← Main HTML markup
├── styles.css    ← All CSS styles
├── script.js     ← All application logic
├── favicon.png   ← App icon
└── README.md     ← This file
```

---

## Running Locally (Step by Step)

### Option 1 — Just Open the File (Quickest)

1. Navigate to the project folder.
2. Double-click **`index.html`**.
3. It opens directly in your default browser. Done.

> **Note:** Everything works perfectly this way — localStorage, all tabs, modals, drag-and-drop. No server is needed for core functionality.

---

### Option 2 — VS Code Live Server (Recommended for Development)

This gives you **auto-reload on save**, which is ideal when you're actively editing code.

1. **Install VS Code** if you haven't: [https://code.visualstudio.com](https://code.visualstudio.com)

2. **Install the Live Server extension:**
   - Open VS Code → Extensions sidebar (`Ctrl+Shift+X`)
   - Search for **"Live Server"** by Ritwick Dey
   - Click **Install**

3. **Open the project folder in VS Code:**
   ```
   File → Open Folder → select the "Anv Checks" folder
   ```

4. **Start Live Server:**
   - Right-click on `index.html` in the Explorer sidebar
   - Click **"Open with Live Server"**
   - Your browser opens automatically at `http://127.0.0.1:5500`

5. **Edit and save any file** — the browser reloads automatically.

---

### Option 3 — Python HTTP Server

If you have Python installed (Python 3):

1. Open a terminal / command prompt.

2. Navigate to the project folder:
   ```bash
   cd "d:\Anv Checks"
   ```

3. Start the server:
   ```bash
   python -m http.server 8080
   ```

4. Open your browser and go to:
   ```
   http://localhost:8080
   ```

5. Press `Ctrl+C` in the terminal to stop the server.

---

### Option 4 — Node.js (`serve` package)

If you have Node.js installed:

1. Install the `serve` package globally (one-time):
   ```bash
   npm install -g serve
   ```

2. Navigate to the project folder and run:
   ```bash
   cd "d:\Anv Checks"
   serve .
   ```

3. Open the URL shown in the terminal (usually `http://localhost:3000`).

4. Press `Ctrl+C` to stop.

---

## Verifying Everything Works

After opening the app in any of the methods above, check the following:

| Feature | How to test |
|---|---|
| **Sidebar tabs** | Click Inbox Feed, Today, Done Archive, Manage Studio — each should switch views |
| **Create a task** | Click the blue **"+ New Task"** button, fill in details, submit |
| **Task persistence** | Create a task, reload the page — it should still be there (localStorage) |
| **Inspector panel** | Click any task card — the right panel opens with editable details |
| **Collections** | Click the folder+ icon in the sidebar to create a Collection |
| **Groups** | Click **"+ Add Group"** to create a group column |
| **Drag & drop** | Drag task cards between groups |
| **Context menus** | Right-click on a task card or group header |
| **Sort options** | Use the Sort dropdown to change task ordering |
| **Console errors** | Open DevTools (`F12` → Console tab) — should show **zero errors** |

---

## Deploying to Vercel

This project is ready for Vercel deployment as-is. No build step required.

1. Push the project to a GitHub repository.

2. Go to [https://vercel.com](https://vercel.com) and sign in.

3. Click **"Add New Project"** → Import your GitHub repo.

4. Vercel auto-detects it as a static site. Leave all settings at default:
   - **Framework Preset:** Other
   - **Build Command:** *(leave empty)*
   - **Output Directory:** `./`

5. Click **Deploy**. Your app will be live in seconds.

---

## Tech Stack

- **HTML5** — Semantic markup
- **CSS3** — Custom styles (in `styles.css`)
- **JavaScript** — Vanilla JS, no frameworks (in `script.js`)
- **Tailwind CSS** — Loaded via CDN for utility classes
- **Lucide Icons** — Loaded via CDN for iconography
- **Google Fonts** — Plus Jakarta Sans font family
