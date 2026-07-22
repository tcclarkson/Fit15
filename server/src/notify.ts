import { v4 as uuidv4 } from "uuid";
import { dbRun, dbAll } from "./db";

export async function notify(userId: string, message: string, type: string, relatedUserId?: string) {
  await dbRun(
    `INSERT INTO notifications (id, user_id, message, type, related_user_id, created_at, read)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [uuidv4(), userId, message, type, relatedUserId || null, new Date().toISOString()]
  );
}

export async function getAcceptedFriendIds(userId: string): Promise<string[]> {
  const rows = await dbAll<{ friend_id: string }>(
    `SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END AS friend_id
     FROM friendships
     WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)`,
    [userId, userId, userId]
  );
  return rows.map((r) => r.friend_id);
}

// Deliberately omits minutes and intensity: Fit 15 celebrates showing up, not
// how long or how hard, so the social-facing message stays comparison-free.
export async function notifyFriendsOfActivity(
  actingUserDisplayName: string,
  actingUserId: string,
  currentStreak: number
) {
  const friendIds = await getAcceptedFriendIds(actingUserId);
  for (const friendId of friendIds) {
    await notify(
      friendId,
      `${actingUserDisplayName} completed today's Fit 15.`,
      "friend_activity",
      actingUserId
    );
    if (currentStreak > 1) {
      await notify(
        friendId,
        `${actingUserDisplayName} kept their ${currentStreak}-day streak alive!`,
        "friend_streak",
        actingUserId
      );
    }
  }
}
