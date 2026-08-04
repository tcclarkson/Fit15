import { Router } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { UPLOADS_DIR, dbGet, dbAll, dbRun } from "../db";
import { requireAuth, AuthedRequest } from "../auth";
import { computeStreak } from "../streak";
import { getUserDates, getUserLogDays, fit15DayCount, REST_ACTIVITY } from "../logDays";
import { isValidActivityKey } from "../activities";
import { notifyFriendsOfActivity } from "../notify";
import { addDays } from "../challengeProgress";

const router = Router();

// Rest days ("life happened") keep a streak alive without a workout, but we cap
// them so a streak still means "mostly moving". Tunable.
const REST_WINDOW_DAYS = 7;
const MAX_REST_PER_WINDOW = 2;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// Allow logging only today or yesterday. A timezone can shift the calendar date
// by up to a day, so accept a window of [UTC today - 2, UTC today + 1] — enough
// to cover "yesterday" in every timezone while blocking rewriting old history.
function isWithinLogWindow(date: string): boolean {
  const today = todayUTC();
  return date >= addDays(today, -2) && date <= addDays(today, 1);
}

// Log (or update) an activity for today or yesterday.
router.post("/", requireAuth, (req: AuthedRequest, res) => {
  upload.single("photo")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    try {
      const { activityType, minutes, note, logDate, isBackfill } = req.body || {};
      const minutesNum = Number(minutes);

      if (!activityType || !isValidActivityKey(activityType)) {
        return res.status(400).json({ error: "Invalid activity type" });
      }
      if (!Number.isFinite(minutesNum) || minutesNum < 15) {
        return res.status(400).json({ error: "Minutes must be at least 15" });
      }
      const date = logDate && isValidDate(logDate) ? logDate : todayUTC();
      if (!isWithinLogWindow(date)) {
        return res.status(400).json({ error: "You can only log today or yesterday" });
      }

      const photoUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
      const existing = (await dbGet(
        "SELECT * FROM activity_logs WHERE user_id = ? AND log_date = ?",
        [req.userId, date]
      )) as any;

      const now = new Date().toISOString();
      if (existing) {
        await dbRun(
          `UPDATE activity_logs SET activity_type = ?, minutes = ?, note = ?, photo_url = COALESCE(?, photo_url)
           WHERE id = ?`,
          [activityType, Math.round(minutesNum), note || null, photoUrl || null, existing.id]
        );
      } else {
        await dbRun(
          `INSERT INTO activity_logs (id, user_id, activity_type, minutes, note, photo_url, log_date, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), req.userId, activityType, Math.round(minutesNum), note || null, photoUrl || null, date, now]
        );
      }

      const streak = computeStreak(await getUserDates(req.userId!), date);

      // Don't ping friends about a backfilled past day (the message says "today").
      const isNewToday = !existing && String(isBackfill) !== "true";
      if (isNewToday) {
        const user = (await dbGet("SELECT * FROM users WHERE id = ?", [req.userId])) as any;
        await notifyFriendsOfActivity(user.display_name, req.userId!, streak.currentStreak);
      }

      const log = await dbGet(
        "SELECT * FROM activity_logs WHERE user_id = ? AND log_date = ?",
        [req.userId, date]
      );
      res.status(existing ? 200 : 201).json({ log, streak });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed to log activity" });
    }
  });
});

// Mark a day as a rest day ("life happened") — keeps the streak alive without a
// workout. Capped per rolling window; can't overwrite a real workout.
router.post("/rest", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { logDate } = req.body || {};
    const date = logDate && isValidDate(logDate) ? logDate : todayUTC();
    if (!isWithinLogWindow(date)) {
      return res.status(400).json({ error: "You can only take a rest day for today or yesterday" });
    }

    const existing = (await dbGet(
      "SELECT * FROM activity_logs WHERE user_id = ? AND log_date = ?",
      [req.userId, date]
    )) as any;
    if (existing && existing.activity_type !== REST_ACTIVITY) {
      return res.status(409).json({ error: "You already logged a workout that day" });
    }

    if (!existing) {
      // Enforce the rolling-window cap (count other rest days near this date).
      const windowStart = addDays(date, -(REST_WINDOW_DAYS - 1));
      const windowEnd = addDays(date, REST_WINDOW_DAYS - 1);
      const restCountRow = (await dbGet<{ c: number }>(
        `SELECT COUNT(*) as c FROM activity_logs
         WHERE user_id = ? AND activity_type = ? AND log_date >= ? AND log_date <= ?`,
        [req.userId, REST_ACTIVITY, windowStart, windowEnd]
      ))!;
      if (Number(restCountRow.c) >= MAX_REST_PER_WINDOW) {
        return res.status(429).json({
          error: `Rest days are limited to ${MAX_REST_PER_WINDOW} per ${REST_WINDOW_DAYS} days — you've used them up. Even a few minutes of movement keeps your streak going.`,
        });
      }
      await dbRun(
        `INSERT INTO activity_logs (id, user_id, activity_type, minutes, note, photo_url, log_date, created_at)
         VALUES (?, ?, ?, 0, ?, NULL, ?, ?)`,
        [uuidv4(), req.userId, REST_ACTIVITY, null, date, new Date().toISOString()]
      );
    }

    const days = await getUserLogDays(req.userId!);
    const streak = computeStreak(days.map((d) => d.date), date);
    res.status(201).json({ streak, totalFit15Days: fit15DayCount(days) });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to log rest day" });
  }
});

// Calendar history — all logs for the current user, most recent first.
router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const logs = await dbAll(
    "SELECT * FROM activity_logs WHERE user_id = ? ORDER BY log_date DESC",
    [req.userId]
  );
  res.json({ logs });
});

router.get("/streak/me", requireAuth, async (req: AuthedRequest, res) => {
  const today =
    typeof req.query.today === "string" && isValidDate(req.query.today) ? req.query.today : todayUTC();
  const yesterday = addDays(today, -1);

  const days = await getUserLogDays(req.userId!);
  const streak = computeStreak(days.map((d) => d.date), today);

  const todayLog = (await dbGet(
    "SELECT * FROM activity_logs WHERE user_id = ? AND log_date = ?",
    [req.userId, today]
  )) as any;
  const yesterdayLog = (await dbGet(
    "SELECT * FROM activity_logs WHERE user_id = ? AND log_date = ?",
    [req.userId, yesterday]
  )) as any;

  res.json({
    streak,
    totalFit15Days: fit15DayCount(days),
    todayLog: todayLog || null,
    loggedToday: !!todayLog,
    loggedYesterday: !!yesterdayLog,
  });
});

export default router;
