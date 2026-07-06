/**
 * Tiny fuzzy matcher — no external deps.
 * Returns a score 0..1 (higher is better) and the matched character indices
 * so we can highlight matched letters in the UI.
 *
 * Heuristics:
 *  - Exact substring  → score 1.0
 *  - Word-prefix      → 0.85
 *  - Subsequence      → 0.5..0.8 depending on density
 *  - No match         → null
 */
export interface FuzzyResult {
  score: number;
  indices: number[];
}

export function fuzzyMatch(text: string, query: string): FuzzyResult | null {
  if (!query) return { score: 0, indices: [] };
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return { score: 0, indices: [] };

  // 1. exact substring
  const exact = t.indexOf(q);
  if (exact !== -1) {
    const indices: number[] = [];
    for (let i = 0; i < q.length; i++) indices.push(exact + i);
    // boost if it starts at a word boundary
    const boundary = exact === 0 || /\s|[-_/]/.test(t[exact - 1] ?? "");
    return { score: boundary ? 1.0 : 0.9, indices };
  }

  // 2. subsequence
  const indices: number[] = [];
  let qi = 0;
  let lastIdx = -1;
  let gaps = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      indices.push(i);
      if (lastIdx !== -1) gaps += i - lastIdx - 1;
      lastIdx = i;
      qi++;
    }
  }
  if (qi !== q.length) return null;

  // density score: tighter matches rank higher
  const span = (indices[indices.length - 1] - indices[0]) + 1;
  const density = q.length / span;
  return { score: 0.4 + density * 0.4, indices };
}

/**
 * Splits a string into segments marked as matched / unmatched, ready to
 * render with highlighting in JSX.
 */
export function highlightSegments(
  text: string,
  indices: number[]
): Array<{ text: string; match: boolean }> {
  if (!indices.length) return [{ text, match: false }];
  const segments: Array<{ text: string; match: boolean }> = [];
  let cursor = 0;
  for (let i = 0; i < text.length; i++) {
    const isMatch = indices.includes(i);
    const prev = segments[segments.length - 1];
    if (prev && prev.match === isMatch) {
      prev.text += text[i];
    } else {
      segments.push({ text: text[i], match: isMatch });
    }
    cursor = i;
  }
  return segments;
}
