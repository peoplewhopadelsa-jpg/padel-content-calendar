# People Who Padel — Content Calendar

Content planning app for the club's content team: a rolling 2-week posting calendar, an inspo bank, session shoot lists, and a lightweight content-bank tracker. Same visual identity as the finance dashboard (near-black + lime green), standalone app, dark mode only.

## Run it locally

```
npm run install:all
npm run dev
```

This starts the API on `http://localhost:3002` and the client on `http://localhost:5174`. No accounts or API keys needed for local dev — it falls back to a local SQLite-compatible file and local disk for uploads.

## Deploying for the whole team (free, no card anywhere)

The team needs the app reachable from anywhere, all the time, with everyone seeing the same data. That takes four free accounts:

| Piece | Service | What it's for |
|---|---|---|
| Frontend | [Netlify](https://netlify.com) | Hosts the React app |
| Backend | [Render](https://render.com) | Runs the Express API (free tier) |
| Database | [Turso](https://turso.tech) | Free hosted SQLite-compatible DB (the free tier's disk isn't persistent, so the data can't live on Render itself) |
| Images | [Cloudinary](https://cloudinary.com) | Free image hosting for inspo screenshots (same reason) |

### 1. Turso (database)

1. Sign up at [turso.tech](https://turso.tech) and install their CLI, or use their web dashboard.
2. Create a database (e.g. `padel-content-calendar`).
3. Get the **database URL** (`libsql://...`) and create an **auth token**. You'll paste both into Render in step 3.

### 2. Cloudinary (images)

1. Sign up at [cloudinary.com](https://cloudinary.com).
2. On your dashboard home, copy the **Cloud name**, **API Key**, and **API Secret**.

### 3. Render (backend)

1. Push this repo to GitHub (Render deploys from a repo).
2. In Render, "New +" → "Blueprint", point it at the repo — it'll pick up `render.yaml` and configure the service (root dir `server/`, build `npm install`, start `npm start`) automatically.
   - No Blueprint support? Create a "Web Service" manually with those same settings.
3. In the service's Environment tab, add the 5 variables from `server/.env.example`: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
4. Deploy, then copy the service's `.onrender.com` URL.

### 4. Netlify (frontend)

1. In Netlify, "Add new site" → import this repo. It reads `netlify.toml` automatically (base dir `client/`, build `npm run build`, publish `dist`).
2. Edit `client/public/_redirects` and replace `YOUR-RENDER-APP` (both occurrences) with the Render URL from step 3, then push — Netlify redeploys on push.
3. Deploy. Netlify gives you a URL — that's what the team bookmarks / adds to their home screen.

### Heads up: cold starts

Render's free tier sleeps the API after ~15 minutes of no traffic and takes 30–50 seconds to wake up on the next request. The first person to open the app after a quiet stretch will see a slow load; everyone after that is fast until it goes quiet again. Live sync (multiple phones seeing edits instantly) also only works while the API is awake — the app polls every 20 seconds as a backstop either way, so it never gets stuck out of sync for long.

## Using it from a phone

Once deployed, open the Netlify URL on a phone and use the browser's "Add to Home Screen" — it opens full-screen like a native app.

## Stack

- `server/`: Express + `@libsql/client` (SQLite-compatible, works local-file or hosted on Turso) + Server-Sent Events (with a polling backstop) for near-real-time sync + `multer` → Cloudinary for image uploads (falls back to local disk if Cloudinary isn't configured).
- `client/`: Vite + React + `react-router-dom`.
