function parseDate(dateStr: string): number {
  // Treat log_date as a plain calendar day (UTC midnight) to avoid TZ drift.
  return Date.parse(`${dateStr}T00:00:00Z`);
}

function dayDiff(a: number, b: number): number {
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
}

/**
 * dates: unique log_date strings (YYYY-MM-DD) for a user, any order.
 * today: the caller's local "today" as YYYY-MM-DD, so streak boundaries match the user's day.
 */
export function computeStreak(dates: string[], today: string): StreakInfo {
  const totalDays = dates.length;
  if (totalDays === 0) return { currentStreak: 0, longestStreak: 0, totalDays: 0 };

  const sorted = [...new Set(dates)].sort();
  const timestamps = sorted.map(parseDate);

  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < timestamps.length; i++) {
    if (dayDiff(timestamps[i], timestamps[i - 1]) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    longestStreak = Math.max(longestStreak, run);
  }

  const todayTs = parseDate(today);
  const lastTs = timestamps[timestamps.length - 1];
  const gapFromToday = dayDiff(todayTs, lastTs);

  let currentStreak = 0;
  // Streak is alive if the most recent log was "today or yesterday". We compare
  // against a single reference date (server UTC when evaluating other people),
  // but a person's local calendar day can differ from that reference by up to
  // one day in either direction — so a log dated one day AHEAD of the reference
  // (an evening logger east of the reference tz) is still "today" for them.
  // Accepting gap ∈ [-1, 1] makes the streak timezone-robust.
  if (gapFromToday >= -1 && gapFromToday <= 1) {
    currentStreak = 1;
    for (let i = timestamps.length - 1; i > 0; i--) {
      if (dayDiff(timestamps[i], timestamps[i - 1]) === 1) {
        currentStreak += 1;
      } else {
        break;
      }
    }
  }

  return { currentStreak, longestStreak, totalDays };
}
