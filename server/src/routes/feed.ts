import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { dbGet, dbAll, dbRun } from "../db";
import { requireAuth, AuthedRequest } from "../auth";
import { getAcceptedFriendIds, notify } from "../notify";
import { isValidReaction } from "../reactions";

const router = Router();

function publicUser(u: any) {
  return { id: u.id, username: u.username, displayName: u.display_name, avatarEmoji: u.avatar_emoji };
}

// Recent activity from friends (and yourself), newest first, with reaction summary.
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const friendIds = await getAcceptedFriendIds(req.userId!);
  const ids = [req.userId!, ...friendIds];
  const placeholders = ids.map(() => "?").join(",");

  const logs = await dbAll<any>(
    `SELECT l.*, u.username, u.display_name, u.avatar_emoji
     FROM activity_logs l
     JOIN users u ON u.id = l.user_id
     WHERE l.user_id IN (${placeholders})
     ORDER BY l.log_date DESC, l.created_at DESC
     LIMIT 50`,
    ids
  );

  // Reaction counts + which ones the viewer added, for the visible posts.
  const byLog = new Map<string, { counts: Record<string, number>; mine: string[] }>();
  const logIds = logs.map((l) => l.id);
  if (logIds.length) {
    const rows = await dbAll<{ log_id: string; emoji: string; user_id: string }>(
      `SELECT log_id, emoji, user_id FROM reactions WHERE log_id IN (${logIds.map(() => "?").join(",")})`,
      logIds
    );
    for (const r of rows) {
      let e = byLog.get(r.log_id);
      if (!e) {
        e = { counts: {}, mine: [] };
        byLog.set(r.log_id, e);
      }
      e.counts[r.emoji] = (e.counts[r.emoji] || 0) + 1;
      if (r.user_id === req.userId) e.mine.push(r.emoji);
    }
  }

  res.json({
    items: logs.map((l) => ({
      id: l.id,
      user: publicUser({ id: l.user_id, username: l.username, display_name: l.display_name, avatar_emoji: l.avatar_emoji }),
      activityType: l.activity_type,
      minutes: l.minutes,
      note: l.note,
      photoUrl: l.photo_url,
      logDate: l.log_date,
      createdAt: l.created_at,
      isMe: l.user_id === req.userId,
      reactions: byLog.get(l.id)?.counts || {},
      myReactions: byLog.get(l.id)?.mine || [],
    })),
  });
});

// Toggle a reaction ("props") on a post. Only on your own or a friend's post.
router.post("/:logId/react", requireAuth, async (req: AuthedRequest, res) => {
  const { emoji } = req.body || {};
  if (!isValidReaction(emoji)) return res.status(400).json({ error: "Invalid reaction" });

  const log = (await dbGet("SELECT id, user_id FROM activity_logs WHERE id = ?", [req.params.logId])) as any;
  if (!log) return res.status(404).json({ error: "Post not found" });

  if (log.user_id !== req.userId) {
    const friendIds = await getAcceptedFriendIds(req.userId!);
    if (!friendIds.includes(log.user_id)) return res.status(403).json({ error: "Not allowed" });
  }

  const existing = (await dbGet(
    "SELECT id FROM reactions WHERE log_id = ? AND user_id = ? AND emoji = ?",
    [log.id, req.userId, emoji]
  )) as any;

  if (existing) {
    await dbRun("DELETE FROM reactions WHERE id = ?", [existing.id]);
    return res.json({ reacted: false });
  }

  await dbRun(
    "INSERT INTO reactions (id, log_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?, ?)",
    [uuidv4(), log.id, req.userId, emoji, new Date().toISOString()]
  );
  if (log.user_id !== req.userId) {
    const me = (await dbGet("SELECT display_name FROM users WHERE id = ?", [req.userId])) as any;
    await notify(log.user_id, `${me.display_name} cheered your Fit 15 ${emoji}`, "reaction", req.userId!);
  }
  res.json({ reacted: true });
});

export default router;
