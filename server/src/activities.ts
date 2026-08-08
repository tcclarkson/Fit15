export interface ActivityDef {
  key: string;
  label: string;
  emoji: string;
  noun: string;
}

export const ACTIVITY_TYPES: ActivityDef[] = [
  { key: "walking", label: "Walking", emoji: "🚶", noun: "walk" },
  { key: "running", label: "Running", emoji: "🏃", noun: "run" },
  { key: "strength", label: "Strength Training", emoji: "🏋️", noun: "strength session" },
  { key: "hiit", label: "HIIT", emoji: "⚡", noun: "HIIT session" },
  { key: "yoga", label: "Yoga", emoji: "🧘", noun: "yoga session" },
  { key: "mobility", label: "Mobility", emoji: "🦵", noun: "mobility session" },
  { key: "pickleball", label: "Pickleball", emoji: "🏓", noun: "pickleball session" },
  { key: "golf", label: "Golf", emoji: "⛳", noun: "golf round" },
  { key: "hiking", label: "Hiking", emoji: "🥾", noun: "hike" },
  { key: "cycling", label: "Cycling", emoji: "🚴", noun: "bike ride" },
  { key: "swimming", label: "Swimming", emoji: "🏊", noun: "swim" },
  { key: "stretching", label: "Stretching", emoji: "🤸", noun: "stretch session" },
  { key: "dancing", label: "Dancing", emoji: "💃", noun: "dance session" },
  { key: "sports", label: "Sports", emoji: "⚽", noun: "sports session" },
  { key: "other", label: "Other", emoji: "✨", noun: "workout" },
];

const BY_KEY = new Map(ACTIVITY_TYPES.map((a) => [a.key, a]));

export function activityNoun(key: string): string {
  return BY_KEY.get(key)?.noun || "workout";
}

export function activityLabel(key: string): string {
  return BY_KEY.get(key)?.label || key;
}

export function isValidActivityKey(key: string): boolean {
  return BY_KEY.has(key);
}
