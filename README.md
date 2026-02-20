# Lota Espresso Tracker (PWA)

A lightweight, offline-ready espresso logging PWA.

## Run locally
Because service workers require https (or localhost), run a simple server:

### Option 1 (Python)
python -m http.server 8000

Open:
http://localhost:8000

### Option 2 (VSCode)
Use "Live Server" extension.

## Deploy to GitHub Pages
- Push this folder to a repo (root).
- In GitHub: Settings → Pages → Deploy from branch → `main` / root.
- Open the Pages URL.

## Data
All shots are saved in `localStorage` on your device.
