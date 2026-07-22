import { dbAll } from "./db";
import { computeStreak, StreakInfo } from "./streak";

export async function getUserDates(userId: string): Promise<string[]> {
  const rows = await dbAll<{ log_date: string }>(
    "SELECT log_date FROM activity_logs WHERE user_id = ?",
    [userId]
  );
  return rows.map((r) => r.log_date);
}

export async function getStreakForUser(userId: string, today: string): Promise<StreakInfo> {
  return computeStreak(await getUserDates(userId), today);
}
