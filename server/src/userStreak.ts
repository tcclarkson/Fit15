import { computeStreak, StreakInfo } from "./streak";
import { getUserDates } from "./logDays";

export { getUserDates };

export async function getStreakForUser(userId: string, today: string): Promise<StreakInfo> {
  return computeStreak(await getUserDates(userId), today);
}
