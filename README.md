# Fit 15

Move your body for at least 15 minutes every day. Log it, keep your streak alive, and see how your friends are doing.

## Structure

- `server/` — Express + TypeScript + SQLite API (auth, activity logs, streaks, friends, feed, notifications)
- `client/` — React + Vite + TypeScript + Tailwind CSS frontend

## Running locally

```bash
# Terminal 1 — API on :3001
cd server
npm install
npm run dev

# Terminal 2 — web app on :5173 (proxies /api and /uploads to :3001)
cd client
npm install
npm run dev
```

Then open http://localhost:5173.

## Core features

- Log today's activity in under 10 seconds: pick an activity, confirm minutes (15 min minimum), optional note/photo.
- Current streak, longest streak, and total Fit 15 days, plus a calendar history.
- Add friends, see their live streaks and whether they've moved today.
- A comparison-free friend feed ("Sarah completed her Fit 15 · Yoga") and in-app notifications — activity is shown, but minutes are kept private so a 15-minute walk reads the same as a 90-minute session.
- A profile screen to pick your own avatar emoji.
- Optional group challenges (shared fixed start/end dates) and personal challenges (rolling window, your own start date), on top of the always-on streak.

## Data storage

The app stores its data in a [libSQL](https://github.com/tursodatabase/libsql) (SQLite-compatible) database:

- **Locally** (no config): a plain SQLite file under `server/data/` — nothing to set up.
- **In production**: point it at a free [Turso](https://turso.tech) database so data persists across restarts and redeploys. Set two env vars — `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. If they're unset in production, the app still runs but falls back to an ephemeral file and logs a warning; data will be lost when the host recycles.

## Deploying (Render)

`render.yaml` at the repo root is a Render Blueprint: one Node web service that builds the client, then serves both the API and the built frontend from a single process/URL.

1. **Create a free Turso database** (so data survives restarts):
   - Sign up at [turso.tech](https://turso.tech) and create a database.
   - Copy its **database URL** (looks like `libsql://your-db-name.turso.io`).
   - Create a **database auth token** and copy it.
2. Push this repo to GitHub (already done if you're reading this from the repo).
3. In the [Render dashboard](https://dashboard.render.com), click **New +** → **Blueprint**, and connect this repo.
4. Pick the branch to deploy. Render detects `render.yaml` and shows the `fit15` service on the free plan. It will prompt you for the two `sync: false` env vars — paste in `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` from step 1.
5. Click **Apply**. Render builds and starts the service; when it's done you'll have a URL like `https://fit15-xxxx.onrender.com` to share.

Two free-tier tradeoffs worth knowing:

- **Photo uploads aren't persistent.** Render's free plan has no persistent disk, so uploaded photos live on ephemeral storage and are lost on restart/redeploy. The core data (accounts, streaks, friends, challenges) lives in Turso and persists. To persist photos too, add a disk in the Render dashboard and set `UPLOADS_DIR` to its mount path — this requires upgrading off the free plan.
- **Cold starts.** Free web services spin down after inactivity; the first request after idle time can take 30-60 seconds to wake back up. That's expected, not a bug.
