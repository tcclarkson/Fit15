// Curated set of profile emojis — used for random assignment at signup and as
// quick picks in the client. Users may also enter any other single emoji.
export const AVATAR_EMOJIS = [
  "🏃", "🚶", "🚴", "🧘", "🏊", "🥾", "💃", "🕺", "🏓", "⚽",
  "🏋️", "🤸", "🦵", "⚡", "🔥", "🌟", "🌈", "🌻", "🐢", "🦊",
  "🐨", "🐼", "🦁", "🐸", "🦄", "🍀", "🌙", "☀️", "💪", "❤️",
  "😎", "🤩", "🥳", "🚀", "🏔️", "🌊", "🎯", "🎵", "🍎", "☕",
];

const graphemeSegmenter = new (Intl as any).Segmenter(undefined, { granularity: "grapheme" });

// Accept any single emoji (one grapheme cluster containing a pictographic
// character) — including ZWJ sequences, skin tones, and flags — while rejecting
// plain text, digits, or multi-character input.
export function isValidAvatarEmoji(input: unknown): input is string {
  if (typeof input !== "string") return false;
  const value = input.trim();
  if (!value || value.length > 32) return false;
  const graphemes = [...graphemeSegmenter.segment(value)];
  if (graphemes.length !== 1) return false;
  return /\p{Extended_Pictographic}/u.test(value);
}
