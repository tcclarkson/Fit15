import webpush from "web-push";
import { v4 as uuidv4 } from "uuid";
import { dbGet, dbAll, dbRun } from "./db";

let vapidPublicKey = "";

// Load VAPID keys from the DB, generating and persisting them on first run so no
// extra env setup is needed. The public key is safe to expose; the private key
// stays server-side (in the DB, same trust boundary as everything else).
export async function initPush(): Promise<void> {
  let pub = (await dbGet<{ value: string }>("SELECT value FROM app_settings WHERE key = 'vapid_public'"))?.value;
  let priv = (await dbGet<{ value: string }>("SELECT value FROM app_settings WHERE key = 'vapid_private'"))?.value;

  if (!pub || !priv) {
    const keys = webpush.generateVAPIDKeys();
    pub = keys.publicKey;
    priv = keys.privateKey;
    await dbRun("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('vapid_public', ?)", [pub]);
    await dbRun("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('vapid_private', ?)", [priv]);
  }

  vapidPublicKey = pub;
  const contact = process.env.VAPID_CONTACT || "mailto:hello@fit15.app";
  webpush.setVapidDetails(contact, pub, priv);
}

export function getVapidPublicKey(): string {
  return vapidPublicKey;
}

interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function saveSubscription(userId: string, sub: WebPushSubscription): Promise<void> {
  await dbRun(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    [uuidv4(), userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth, new Date().toISOString()]
  );
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await dbRun("DELETE FROM push_subscriptions WHERE endpoint = ?", [endpoint]);
}

interface StoredSub {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Send a notification to all of a user's devices. Prunes subscriptions that the
// push service reports as gone (404/410).
export async function sendToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  const subs = await dbAll<StoredSub>("SELECT * FROM push_subscriptions WHERE user_id = ?", [userId]);
  const body = JSON.stringify(payload);
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body
      );
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await dbRun("DELETE FROM push_subscriptions WHERE id = ?", [sub.id]);
      } else {
        console.error("push send failed:", err?.statusCode, err?.body || err?.message);
      }
    }
  }
}

// Don't nag more than a few hours after the chosen time (avoids a 2am ping if the
// scheduler was asleep at the reminder time).
const MAX_LATE_MINUTES = 4 * 60;

// Send the daily "did you move?" reminder to everyone who is due: reminder on,
// their local time has reached (but not long-passed) their chosen time, they
// haven't been reminded yet today, and they haven't logged today.
export async function runDailyReminders(): Promise<number> {
  const users = await dbAll<any>(
    `SELECT id, display_name, reminder_minutes, tz_offset_minutes, last_reminded_date
     FROM users WHERE reminder_enabled = 1 AND reminder_minutes IS NOT NULL`
  );
  if (users.length === 0) return 0;

  const nowMs = Date.now();
  let sent = 0;

  for (const u of users) {
    const offset = Number(u.tz_offset_minutes) || 0;
    const local = new Date(nowMs + offset * 60000);
    const localDate = local.toISOString().slice(0, 10);
    const localMinutes = local.getUTCHours() * 60 + local.getUTCMinutes();
    const target = Number(u.reminder_minutes);

    if (u.last_reminded_date === localDate) continue;
    if (localMinutes < target || localMinutes > target + MAX_LATE_MINUTES) continue;

    // Skip if they already logged (any activity or rest) for their local today.
    const logged = await dbGet("SELECT 1 as ok FROM activity_logs WHERE user_id = ? AND log_date = ?", [
      u.id,
      localDate,
    ]);
    // Mark as handled regardless, so we don't re-check every run today.
    await dbRun("UPDATE users SET last_reminded_date = ? WHERE id = ?", [localDate, u.id]);
    if (logged) continue;

    await sendToUser(u.id, {
      title: "Fit 15 🔥",
      body: "Did you get your 15 minutes in today? Tap to log it.",
      url: "/",
    });
    sent += 1;
  }

  return sent;
}
