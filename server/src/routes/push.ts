import { Router } from "express";
import { dbRun } from "../db";
import { requireAuth, AuthedRequest } from "../auth";
import { getVapidPublicKey, saveSubscription, removeSubscription, runDailyReminders } from "../push";

const router = Router();

router.get("/vapid-public-key", (_req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

// Save a browser push subscription and the user's daily-reminder preference.
router.post("/subscribe", requireAuth, async (req: AuthedRequest, res) => {
  const { subscription, reminderMinutes, tzOffsetMinutes } = req.body || {};
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ error: "Invalid subscription" });
  }
  const minutes = Number(reminderMinutes);
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1439) {
    return res.status(400).json({ error: "reminderMinutes must be 0-1439" });
  }
  const offset = Number.isFinite(Number(tzOffsetMinutes)) ? Math.trunc(Number(tzOffsetMinutes)) : 0;

  await saveSubscription(req.userId!, subscription);
  await dbRun(
    "UPDATE users SET reminder_enabled = 1, reminder_minutes = ?, tz_offset_minutes = ?, last_reminded_date = NULL WHERE id = ?",
    [minutes, offset, req.userId]
  );
  res.json({ ok: true });
});

// Update just the reminder time (subscription already saved).
router.post("/reminder", requireAuth, async (req: AuthedRequest, res) => {
  const { reminderMinutes, tzOffsetMinutes } = req.body || {};
  const minutes = Number(reminderMinutes);
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1439) {
    return res.status(400).json({ error: "reminderMinutes must be 0-1439" });
  }
  const offset = Number.isFinite(Number(tzOffsetMinutes)) ? Math.trunc(Number(tzOffsetMinutes)) : 0;
  await dbRun(
    "UPDATE users SET reminder_enabled = 1, reminder_minutes = ?, tz_offset_minutes = ?, last_reminded_date = NULL WHERE id = ?",
    [minutes, offset, req.userId]
  );
  res.json({ ok: true });
});

// Turn reminders off and drop this device's subscription.
router.post("/unsubscribe", requireAuth, async (req: AuthedRequest, res) => {
  const { endpoint } = req.body || {};
  if (endpoint) await removeSubscription(endpoint);
  await dbRun("UPDATE users SET reminder_enabled = 0 WHERE id = ?", [req.userId]);
  res.json({ ok: true });
});

// Trigger the daily reminder sweep. Protected by a shared secret so an external
// scheduler (e.g. a cron ping) can drive it on hosts that sleep when idle.
router.post("/reminders/run", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const provided = req.get("x-cron-secret") || (req.query.secret as string | undefined);
  if (secret && provided !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const sent = await runDailyReminders();
  res.json({ ok: true, sent });
});

export default router;
