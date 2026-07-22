import { Router } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { UPLOADS_DIR, dbGet, dbAll, dbRun } from "../db";
import { requireAuth, AuthedRequest } from "../auth";
import { computeStreak } from "../streak";
import { getUserDates } from "../userStreak";
import { isValidActivityKey } from "../activities";
import { notifyFriendsOfActivity } from "../notify";

const router = Router();

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

// Log (or update) today's activity.
router.post("/", requireAuth, (req: AuthedRequest, res) => {
  upload.single("photo")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    try {
      const { activityType, minutes, note, logDate } = req.body || {};
      const minutesNum = Number(minutes);

      if (!activityType || !isValidActivityKey(activityType)) {
        return res.status(400).json({ error: "Invalid activity type" });
      }
      if (!Number.isFinite(minutesNum) || minutesNum < 15) {
        return res.status(400).json({ error: "Minutes must be at least 15" });
      }
      const date = logDate && isValidDate(logDate) ? logDate : new Date().toISOString().slice(0, 10);

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

      const dates = await getUserDates(req.userId!);
      const streak = computeStreak(dates, date);

      if (!existing) {
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
    typeof req.query.today === "string" && isValidDate(req.query.today)
      ? req.query.today
      : new Date().toISOString().slice(0, 10);
  const dates = await getUserDates(req.userId!);
  const streak = computeStreak(dates, today);
  const todayLog = await dbGet(
    "SELECT * FROM activity_logs WHERE user_id = ? AND log_date = ?",
    [req.userId, today]
  );
  res.json({ streak, todayLog: todayLog || null });
});

export default router;
