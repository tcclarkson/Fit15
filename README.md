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
