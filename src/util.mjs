/**
 * Small shared helpers for the static-site build.
 */

/** Escape text for safe insertion into HTML element content. */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Escape text for use inside a double-quoted HTML attribute. */
export function attr(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Western-Arabic digits → keep as-is; just format thousands with a separator. */
export function num(n) {
  return Number(n || 0).toLocaleString('en-US');
}

/** Deterministic shuffle (seeded) so "random" rows stay stable between builds. */
export function seededPick(arr, count, seed = 1) {
  const a = [...arr];
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, count);
}

/** Truncate a string to maxLen on a word boundary, adding an ellipsis. */
export function clip(str, maxLen) {
  const s = String(str || '').trim();
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
}
