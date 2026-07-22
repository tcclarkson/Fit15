import { Router } from "express";
import { dbAll } from "../db";
import { requireAuth, AuthedRequest } from "../auth";
import { getAcceptedFriendIds } from "../notify";

const router = Router();

function publicUser(u: any) {
  return { id: u.id, username: u.username, displayName: u.display_name, avatarEmoji: u.avatar_emoji };
}

// Recent activity from friends (and yourself), newest first.
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
    })),
  });
});

export default router;
