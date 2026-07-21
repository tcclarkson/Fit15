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
- A friend activity feed and in-app notifications ("Sarah kept her 42-day streak alive!").
- Optional group challenges (shared fixed start/end dates) and personal challenges (rolling window, your own start date), on top of the always-on streak.

## Deploying (Render)

`render.yaml` at the repo root is a Render Blueprint: one Node web service that builds the client, then serves both the API and the built frontend from a single process/URL.

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In the [Render dashboard](https://dashboard.render.com), click **New +** → **Blueprint**, and connect this repo.
3. Pick the branch to deploy. Render detects `render.yaml` and shows the `fit15` service on the free plan.
4. Click **Apply**. Render builds and starts the service; when it's done you'll have a URL like `https://fit15-xxxx.onrender.com` to share.

Two free-tier tradeoffs worth knowing:

- **No persistent disk.** The blueprint targets Render's free plan, which doesn't support disks. That means the SQLite database and uploaded photos reset whenever the service restarts or redeploys — fine for a short trial, not for anything you want to keep long-term. To persist data, add a disk to the service in the Render dashboard (mount it at, say, `/var/data`, then set the `DATA_DIR=/var/data/db` and `UPLOADS_DIR=/var/data/uploads` env vars) — this requires upgrading off the free plan.
- **Cold starts.** Free web services spin down after inactivity; the first request after idle time can take 30-60 seconds to wake back up. That's expected, not a bug.
