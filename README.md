# Strike Trading

Trading Journal & Prop Firm Funding Challenge Tracker.

## Run locally

```bash
npm install
npm run dev
```

Opens at http://localhost:5173

## Build for production

```bash
npm run build
```

Outputs a static site to `dist/`. `npm run preview` serves that build locally to sanity-check it.

## Deploy

This is a static single-page app — any static host works. Easiest path:

**Vercel**
1. Push this folder to a GitHub repo.
2. Go to vercel.com → New Project → import the repo.
3. Framework preset: Vite (auto-detected). Click Deploy.

**Netlify**
1. Push to GitHub, then Netlify → Add new site → Import from Git.
2. Build command: `npm run build`, publish directory: `dist`.

**Netlify drag-and-drop (no git needed)**
1. Run `npm run build` locally.
2. Drag the `dist/` folder onto app.netlify.com/drop.

**Cloudflare Pages**
1. Connect the GitHub repo.
2. Build command: `npm run build`, output directory: `dist`.

All three auto-redeploy on every git push and give you a free HTTPS URL + custom domain support.

## Next steps (backend)

State currently lives in React (`useState` in `App.jsx`) with mock data. `trades` and `challenges` are flat arrays of plain objects designed to map 1:1 onto Supabase/Firebase tables — swapping the `useState(MOCK_TRADES)` calls for a real fetch is the main integration point.
