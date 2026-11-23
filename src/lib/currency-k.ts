/**
 * Thousand-VND ("K" / ".000 đ") input conversion & 1000x typo safeguard utilities.
 *
 * All persisted database & VietQR monetary values MUST stay exact integer VND (`bigint`).
 * This module translates only at the UI boundary:
 *   "50"    -> 50_000 VND
 *   "12.5"  -> 12_500 VND
 *   "12,5"  -> 12_500 VND
 *   "0.5"   -> 500 VND
 *   "0"     -> 0 VND
 *   ""      -> null
 */

export interface FullVndMistakeWarning {
  enteredVnd: number;
  suggestedK: string;
  suggestedVnd: number;
}

/**
 * Sanitize user-typed K input while typing (keeps digits and at most one decimal separator).
 */
export function sanitizeKInput(raw: string): string {
  const normalized = raw.replace(/\s+/g, '').replace(/,/g, '.');
  let out = '';
  let seenDot = false;
  for (const ch of normalized) {
    if (ch >= '0' && ch <= '9') {
      out += ch;
    } else if (ch === '.' && !seenDot) {
      seenDot = true;
      out += out.length === 0 ? '0.' : '.';
    }
  }
  return out;
}

/**
 * Convert a thousand-VND input string into an exact non-negative integer VND amount.
 * Returns `null` for empty or invalid input.
 */
export function parseKToVnd(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s+/g, '');
  if (!trimmed) return null;

  // Replace Vietnamese comma decimal with dot
  const normalized = trimmed.replace(/,/g, '.');

  // Reject malformed strings with multiple dots or non-numeric characters
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 1000);
}

/**
 * Convert a stored integer VND amount back into a clean K-unit string for editing.
 * Examples:
 *   125000 -> "125"
 *   12500  -> "12.5"
 *   500    -> "0.5"
 *   0      -> "0"
 *   null   -> ""
 */
export function formatVndToKInput(vnd: number | null | undefined): string {
  if (vnd === null || vnd === undefined || !Number.isFinite(vnd) || vnd < 0) {
    return '';
  }
  const rounded = Math.round(vnd);
  if (rounded === 0) return '0';

  const kValue = rounded / 1000;
  // Format with up to 3 decimals, then strip insignificant trailing zeros
  const fixed = kValue.toFixed(3);
  return fixed.replace(/\.?0+$/, '');
}

/**
 * Detects when a user habituated to typing full VND accidentally enters e.g. "50000"
 * (which in K-unit becomes 50.000.000 đ) instead of "50".
 */
export function detectLikelyFullVndMistake(raw: string): FullVndMistakeWarning | null {
  const trimmed = raw.trim().replace(/\s+/g, '');
  if (!/^\d+$/.test(trimmed)) return null;

  const numericK = Number(trimmed);
  if (!Number.isFinite(numericK) || numericK < 10_000 || numericK % 1000 !== 0) {
    return null;
  }

  const enteredVnd = Math.round(numericK * 1000);
  const suggestedVnd = numericK;
  const suggestedK = formatVndToKInput(suggestedVnd);

  return {
    enteredVnd,
    suggestedK,
    suggestedVnd,
  };
}
