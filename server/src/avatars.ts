// Curated set of profile emojis. Used for random assignment at signup, for
// validating profile updates, and surfaced to the client so the picker grid
// always matches what the server will accept.
export const AVATAR_EMOJIS = [
  "🏃", "🚶", "🚴", "🧘", "🏊", "🥾", "💃", "🕺", "🏓", "⚽",
  "🏋️", "🤸", "🦵", "⚡", "🔥", "🌟", "🌈", "🌻", "🐢", "🦊",
  "🐨", "🐼", "🦁", "🐸", "🦄", "🍀", "🌙", "☀️", "💪", "❤️",
  "😎", "🤩", "🥳", "🚀", "🏔️", "🌊", "🎯", "🎵", "🍎", "☕",
];

const AVATAR_SET = new Set(AVATAR_EMOJIS);

export function isValidAvatarEmoji(emoji: string): boolean {
  return AVATAR_SET.has(emoji);
}
