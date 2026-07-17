import { v4 as uuidv4 } from "uuid";
import { db } from "./db";
import { activityNoun } from "./activities";

export function notify(userId: string, message: string, type: string, relatedUserId?: string) {
  db.prepare(
    `INSERT INTO notifications (id, user_id, message, type, related_user_id, created_at, read)
     VALUES (?, ?, ?, ?, ?, ?, 0)`
  ).run(uuidv4(), userId, message, type, relatedUserId || null, new Date().toISOString());
}

export function getAcceptedFriendIds(userId: string): string[] {
  const rows = db
    .prepare(
      `SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END AS friend_id
       FROM friendships
       WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)`
    )
    .all(userId, userId, userId) as { friend_id: string }[];
  return rows.map((r) => r.friend_id);
}

export function notifyFriendsOfActivity(
  actingUserDisplayName: string,
  actingUserId: string,
  minutes: number,
  activityType: string,
  currentStreak: number
) {
  const friendIds = getAcceptedFriendIds(actingUserId);
  const noun = activityNoun(activityType);
  for (const friendId of friendIds) {
    notify(
      friendId,
      `${actingUserDisplayName} just logged a ${minutes}-minute ${noun}.`,
      "friend_activity",
      actingUserId
    );
    if (currentStreak > 1) {
      notify(
        friendId,
        `${actingUserDisplayName} kept their ${currentStreak}-day streak alive!`,
        "friend_streak",
        actingUserId
      );
    }
  }
}
