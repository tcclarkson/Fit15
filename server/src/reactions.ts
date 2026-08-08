// One-tap "props" reactions available on feed posts.
export const REACTION_EMOJIS = ["🔥", "👏", "💪", "🎉"];
const REACTION_SET = new Set(REACTION_EMOJIS);

export function isValidReaction(emoji: unknown): emoji is string {
  return typeof emoji === "string" && REACTION_SET.has(emoji);
}
