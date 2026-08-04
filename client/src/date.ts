export function todayLocal(): string {
  return todayLocalFromDate(new Date());
}

// Local calendar date `daysAgo` days before today (0 = today, 1 = yesterday…).
export function localDateOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return todayLocalFromDate(d);
}

export function yesterdayLocal(): string {
  return localDateOffset(1);
}

function isSameLocalDay(date: Date, dateStr: string): boolean {
  return todayLocalFromDate(date) === dateStr;
}

function todayLocalFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatFriendlyDate(dateStr: string): string {
  if (dateStr === todayLocal()) return "Today";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameLocalDay(yesterday, dateStr)) return "Yesterday";

  const [yy, mm, dd] = dateStr.split("-").map(Number);
  const d = new Date(yy, mm - 1, dd);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
