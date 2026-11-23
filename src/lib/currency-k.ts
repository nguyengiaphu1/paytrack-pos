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

const DOT_THOUSANDS_FULL_RE = /^[1-9]\d{0,2}(\.\d{3})+$/;
const DOT_THOUSANDS_PARTIAL_RE = /^[1-9]\d{0,2}(\.\d{3})+\.\d{0,3}$/;

/**
 * Sanitize user-typed K input while typing.
 * Keeps digits and a single decimal separator, while preserving Vietnamese dot-grouped
 * thousands patterns (e.g. "125.000", "1.250.000") so detectLikelyFullVndMistake can warn
 * safely instead of silently truncating to 1/1000x.
 */
export function sanitizeKInput(raw: string): string {
  const compact = raw.replace(/\s+/g, '');
  if (
    !compact.includes(',') &&
    (DOT_THOUSANDS_FULL_RE.test(compact) || DOT_THOUSANDS_PARTIAL_RE.test(compact))
  ) {
    return compact;
  }

  const normalized = compact.replace(/,/g, '.');
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
 * Detects when a user habituated to typing full VND accidentally enters:
 * - Pure full VND digits >= 10000 divisible by 1000 (e.g. "50000" -> 50.000.000đ instead of "50")
 * - Dot-grouped Vietnamese thousands (e.g. "125.000", "12.500", "1.250.000")
 */
export function detectLikelyFullVndMistake(raw: string): FullVndMistakeWarning | null {
  const trimmed = raw.trim().replace(/\s+/g, '');

  // Case 1: Vietnamese dot-grouped thousands (e.g. "125.000", "12.500", "1.250.000")
  if (DOT_THOUSANDS_FULL_RE.test(trimmed)) {
    const dotCount = (trimmed.match(/\./g) ?? []).length;
    const groupedVnd = Number(trimmed.replace(/\./g, ''));
    if (
      Number.isFinite(groupedVnd) &&
      groupedVnd >= 1000 &&
      (dotCount >= 2 || groupedVnd % 500 === 0)
    ) {
      return {
        enteredVnd: groupedVnd,
        suggestedK: formatVndToKInput(groupedVnd),
        suggestedVnd: groupedVnd,
      };
    }
    return null;
  }

  // Case 2: Pure integer full VND (e.g. "50000", "125000")
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
