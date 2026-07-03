# Weight Tracker

A mobile-friendly web app to log daily weight, view weekly averages, and track bulking or cutting phases.

## Features

- **Daily logging** — record weight for today or any past date
- **Weekly averages** — computed per calendar week (Mon–Sun)
- **Flexible window** — choose how many past weeks to include (1–52)
- **Trend chart** — daily weights plus weekly average line
- **Named projects** — separate cutting and bulking cycles
- **Local storage** — works offline in your browser
- **Cloud sync** — optional Supabase sync across devices
- **PWA-ready** — add to home screen on iPhone or Android

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Cloud sync setup (optional)

Cloud sync uses [Supabase](https://supabase.com) for auth and database storage.

1. Create a free Supabase project.
2. In the Supabase SQL editor, run the schema in [`supabase/schema.sql`](supabase/schema.sql).
3. Copy `.env.example` to `.env` and fill in your project values:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Restart the dev server.
5. In the app, open **Cloud sync**, create an account, and sign in.

### How sync works

- Data is still cached locally in `localStorage` for fast/offline use.
- When you sign in, the app merges local and cloud data (newer changes win).
- After that, changes auto-sync to Supabase within about a second.
- Each user only sees their own data via Supabase row-level security.

## Build for production

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, GitHub Pages, etc.). Set the same `VITE_SUPABASE_*` environment variables in your hosting provider.

## Platform note

A website is the easiest path — no App Store review, works on iOS and Android via the browser, and you can install it like an app from Safari (Share → Add to Home Screen) or Chrome (Install app).
