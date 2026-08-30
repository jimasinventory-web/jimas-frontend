# JIMAS Computers — Frontend

React 19 (Create React App) frontend for the JIMAS Computers Inventory & POS system.

## What changed in this version (1.1)

- **Backend URL is now configurable** via `REACT_APP_API_BASE` (see `.env.example`) instead of being hardcoded.
- **Auto-logout when your login token expires** (no more silent failures after 12 hours).
- **New Low Stock card** on the dashboard (products with 3 or fewer units), which links to Inventory.
- **Responsive polish:** tables scroll on all screens, bigger tap targets on phones, inputs no longer trigger iOS zoom, sticky top bar, safe-area support for notched phones, and a cleaner print layout for receipts/reports.
- **Branding/PWA:** proper app title, theme colour, and installable manifest (was still "React App").

## Run locally

```bash
npm install
npm start          # opens http://localhost:3000
```

To point the app at a different backend, create a `.env` file:

```
REACT_APP_API_BASE=https://your-backend-url.onrender.com
```

Then restart `npm start` (CRA only reads env variables at startup).

## Build for production

```bash
npm run build      # outputs a static site into build/
```

Deploy the `build/` folder to any static host (Render Static Site, Netlify, Vercel, etc.).
On Render, set `REACT_APP_API_BASE` under the service's **Environment** settings so the
build points at your live backend.

## Available scripts

- `npm start` — development server
- `npm run build` — production build
- `npm test` — test runner
