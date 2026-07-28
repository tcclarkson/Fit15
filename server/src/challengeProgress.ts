function parseDate(dateStr: string): number {
  return Date.parse(`${dateStr}T00:00:00Z`);
}

function dayDiff(a: number, b: number): number {
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

function addDays(dateStr: string, days: number): string {
  const ts = parseDate(dateStr) + days * 24 * 60 * 60 * 1000;
  return new Date(ts).toISOString().slice(0, 10);
}

function minDate(a: string, b: string): string {
  return parseDate(a) <= parseDate(b) ? a : b;
}

function maxDate(a: string, b: string): string {
  return parseDate(a) >= parseDate(b) ? a : b;
}

export interface ChallengeProgress {
  currentStreak: number;
  totalDaysHit: number;
  targetDays: number;
  daysRemaining: number;
  daysUntilStart: number;
  isUpcoming: boolean;
  isEnded: boolean;
  effectiveStart: string;
  effectiveEnd: string;
}

/**
 * dates: the member's logged activity dates (any order, not necessarily unique).
 * memberStart/memberEnd: the member's full window for this challenge.
 * resetDate: if set, progress before this date doesn't count (manual restart).
 * today: caller's local "today" (YYYY-MM-DD).
 */
export function computeChallengeProgress(
  dates: string[],
  memberStart: string,
  memberEnd: string,
  resetDate: string | null,
  today: string
): ChallengeProgress {
  const effectiveStart = resetDate ? maxDate(memberStart, resetDate) : memberStart;
  const effectiveEnd = memberEnd;
  const targetDays = dayDiff(parseDate(effectiveEnd), parseDate(effectiveStart)) + 1;

  const isUpcoming = parseDate(today) < parseDate(effectiveStart);
  const isEnded = parseDate(today) > parseDate(effectiveEnd);
  const countableEnd = minDate(today, effectiveEnd);
  // A member's local calendar day can run up to one day ahead of the reference
  // date (server UTC), so include logs dated one day past `today` (capped at the
  // challenge end) — otherwise an evening logger's most recent day is dropped.
  const filterEnd = minDate(addDays(today, 1), effectiveEnd);

  const relevant = [...new Set(dates)]
    .filter((d) => parseDate(d) >= parseDate(effectiveStart) && parseDate(d) <= parseDate(filterEnd))
    .sort();

  const totalDaysHit = relevant.length;

  let currentStreak = 0;
  if (relevant.length > 0 && !isUpcoming) {
    const lastTs = parseDate(relevant[relevant.length - 1]);
    const gapFromToday = dayDiff(parseDate(countableEnd), lastTs);
    // Timezone-robust: accept the most recent log within one day either side
    // of the reference date (see computeStreak for the full rationale).
    if (gapFromToday >= -1 && gapFromToday <= 1) {
      currentStreak = 1;
      for (let i = relevant.length - 1; i > 0; i--) {
        if (dayDiff(parseDate(relevant[i]), parseDate(relevant[i - 1])) === 1) {
          currentStreak += 1;
        } else {
          break;
        }
      }
    }
  }

  const daysRemaining = isEnded || isUpcoming ? 0 : dayDiff(parseDate(effectiveEnd), parseDate(countableEnd));
  const daysUntilStart = isUpcoming ? dayDiff(parseDate(effectiveStart), parseDate(today)) : 0;

  return {
    currentStreak,
    totalDaysHit,
    targetDays,
    daysRemaining,
    daysUntilStart,
    isUpcoming,
    isEnded,
    effectiveStart,
    effectiveEnd,
  };
}

export { addDays };
