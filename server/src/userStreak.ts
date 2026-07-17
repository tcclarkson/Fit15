import { db } from "./db";
import { computeStreak, StreakInfo } from "./streak";

export function getUserDates(userId: string): string[] {
  const rows = db
    .prepare("SELECT log_date FROM activity_logs WHERE user_id = ?")
    .all(userId) as { log_date: string }[];
  return rows.map((r) => r.log_date);
}

export function getStreakForUser(userId: string, today: string): StreakInfo {
  return computeStreak(getUserDates(userId), today);
}
