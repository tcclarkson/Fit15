import { dbAll } from "./db";

export const REST_ACTIVITY = "rest";

export interface LogDay {
  date: string;
  isRest: boolean;
}

// All of a user's logged days (workouts + rest), for streak-chain computation.
export async function getUserLogDays(userId: string): Promise<LogDay[]> {
  const rows = await dbAll<{ log_date: string; activity_type: string }>(
    "SELECT log_date, activity_type FROM activity_logs WHERE user_id = ?",
    [userId]
  );
  return rows.map((r) => ({ date: r.log_date, isRest: r.activity_type === REST_ACTIVITY }));
}

// Just the dates (workouts + rest) — rest days keep a streak alive, so the
// consecutive-day chain includes them.
export async function getUserDates(userId: string): Promise<string[]> {
  const days = await getUserLogDays(userId);
  return days.map((d) => d.date);
}

export function fit15DayCount(days: LogDay[]): number {
  return days.filter((d) => !d.isRest).length;
}
