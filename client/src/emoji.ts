const segmenter =
  "Segmenter" in Intl ? new (Intl as any).Segmenter(undefined, { granularity: "grapheme" }) : null;

export function isEmoji(s: string): boolean {
  return /\p{Extended_Pictographic}/u.test(s);
}

// The last emoji grapheme in a string, or "" if none. Used so that when someone
// types/picks an emoji into a field that already holds one, we take the new one.
export function lastEmoji(input: string): string {
  const value = input.trim();
  if (!value) return "";
  let graphemes: string[];
  if (segmenter) {
    graphemes = [...segmenter.segment(value)].map((g: any) => g.segment);
  } else {
    graphemes = Array.from(value);
  }
  for (let i = graphemes.length - 1; i >= 0; i--) {
    if (isEmoji(graphemes[i])) return graphemes[i];
  }
  return "";
}
