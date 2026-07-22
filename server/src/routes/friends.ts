import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { dbGet, dbAll, dbRun } from "../db";
import { requireAuth, AuthedRequest } from "../auth";
import { getStreakForUser } from "../userStreak";

const router = Router();

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function publicUser(u: any) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    avatarEmoji: u.avatar_emoji,
  };
}

// Search users to add as friends.
router.get("/search", requireAuth, async (req: AuthedRequest, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  if (q.length < 2) return res.json({ users: [] });

  const users = await dbAll<any>(
    `SELECT * FROM users
     WHERE id != ? AND (LOWER(username) LIKE ? OR LOWER(display_name) LIKE ?)
     LIMIT 20`,
    [req.userId, `%${q}%`, `%${q}%`]
  );

  const relations = await dbAll<any>(
    `SELECT * FROM friendships WHERE requester_id = ? OR addressee_id = ?`,
    [req.userId, req.userId]
  );

  const results = users.map((u) => {
    const rel = relations.find((r) => r.requester_id === u.id || r.addressee_id === u.id);
    let status = "none";
    if (rel) {
      status = rel.status === "accepted" ? "friends" : rel.requester_id === req.userId ? "pending_sent" : "pending_received";
    }
    return { ...publicUser(u), relationshipStatus: status };
  });

  res.json({ users: results });
});

// Send a friend request.
router.post("/request", requireAuth, async (req: AuthedRequest, res) => {
  const { targetUserId } = req.body || {};
  if (!targetUserId || targetUserId === req.userId) {
    return res.status(400).json({ error: "Invalid target user" });
  }
  const target = await dbGet("SELECT * FROM users WHERE id = ?", [targetUserId]);
  if (!target) return res.status(404).json({ error: "User not found" });

  const existing = await dbGet(
    `SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`,
    [req.userId, targetUserId, targetUserId, req.userId]
  );
  if (existing) return res.status(409).json({ error: "Request already exists" });

  await dbRun(
    `INSERT INTO friendships (id, requester_id, addressee_id, status, created_at) VALUES (?, ?, ?, 'pending', ?)`,
    [uuidv4(), req.userId, targetUserId, new Date().toISOString()]
  );

  res.status(201).json({ ok: true });
});

// Incoming pending requests.
router.get("/requests", requireAuth, async (req: AuthedRequest, res) => {
  const rows = await dbAll<any>(
    `SELECT f.id as friendshipId, u.* FROM friendships f
     JOIN users u ON u.id = f.requester_id
     WHERE f.addressee_id = ? AND f.status = 'pending'`,
    [req.userId]
  );
  res.json({
    requests: rows.map((r) => ({ friendshipId: r.friendshipId, user: publicUser(r) })),
  });
});

router.post("/:friendshipId/accept", requireAuth, async (req: AuthedRequest, res) => {
  const friendship = (await dbGet(
    "SELECT * FROM friendships WHERE id = ? AND addressee_id = ?",
    [req.params.friendshipId, req.userId]
  )) as any;
  if (!friendship) return res.status(404).json({ error: "Request not found" });
  await dbRun("UPDATE friendships SET status = 'accepted' WHERE id = ?", [friendship.id]);
  res.json({ ok: true });
});

router.post("/:friendshipId/decline", requireAuth, async (req: AuthedRequest, res) => {
  const friendship = (await dbGet(
    "SELECT * FROM friendships WHERE id = ? AND addressee_id = ?",
    [req.params.friendshipId, req.userId]
  )) as any;
  if (!friendship) return res.status(404).json({ error: "Request not found" });
  await dbRun("DELETE FROM friendships WHERE id = ?", [friendship.id]);
  res.json({ ok: true });
});

// Remove a friend or cancel an outgoing request.
router.delete("/:friendshipId", requireAuth, async (req: AuthedRequest, res) => {
  const friendship = (await dbGet(
    "SELECT * FROM friendships WHERE id = ? AND (requester_id = ? OR addressee_id = ?)",
    [req.params.friendshipId, req.userId, req.userId]
  )) as any;
  if (!friendship) return res.status(404).json({ error: "Not found" });
  await dbRun("DELETE FROM friendships WHERE id = ?", [friendship.id]);
  res.json({ ok: true });
});

// Accepted friends list with live streak + today's status.
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const rows = await dbAll<any>(
    `SELECT f.id as friendshipId, u.* FROM friendships f
     JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
     WHERE f.status = 'accepted' AND (f.requester_id = ? OR f.addressee_id = ?)`,
    [req.userId, req.userId, req.userId]
  );

  const today = todayStr();
  const meStreak = await getStreakForUser(req.userId!, today);

  const friends = await Promise.all(
    rows.map(async (r) => {
      const streak = await getStreakForUser(r.id, today);
      const todayLog = (await dbGet(
        "SELECT * FROM activity_logs WHERE user_id = ? AND log_date = ?",
        [r.id, today]
      )) as any;
      return {
        friendshipId: r.friendshipId,
        user: publicUser(r),
        streak,
        loggedToday: !!todayLog,
        todayActivity: todayLog ? { activityType: todayLog.activity_type, minutes: todayLog.minutes } : null,
        daysAheadOfMe: streak.currentStreak - meStreak.currentStreak,
      };
    })
  );

  friends.sort((a, b) => b.streak.currentStreak - a.streak.currentStreak);
  res.json({ friends });
});

export default router;
