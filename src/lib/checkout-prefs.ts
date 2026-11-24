import { isPaymentAccount } from '@/lib/ledger';
import type { PaymentAccount } from '@/types/database';

export type DefaultPayChoice = 'full_transfer' | 'full_cash';

export interface CheckoutPrefs {
  lastChoice: DefaultPayChoice;
  lastAccount: PaymentAccount | null;
  recentAccounts: PaymentAccount[];
}

export const DEFAULT_FEATURED_ACCOUNTS: readonly PaymentAccount[] = [
  'Thanh',
  'Phú',
  'Vận chuyển',
];

export const DEFAULT_CHECKOUT_PREFS: CheckoutPrefs = {
  lastChoice: 'full_transfer',
  lastAccount: null,
  recentAccounts: [],
};

const STORAGE_KEY = 'paytrack:checkout-prefs:v1';
const MAX_RECENT_ACCOUNTS = 4;

export function sanitizeCheckoutPrefs(raw: unknown): CheckoutPrefs {
  if (!raw || typeof raw !== 'object') return DEFAULT_CHECKOUT_PREFS;
  const obj = raw as Record<string, unknown>;

  const lastChoice: DefaultPayChoice =
    obj.lastChoice === 'full_cash' ? 'full_cash' : 'full_transfer';

  const lastAccount: PaymentAccount | null =
    typeof obj.lastAccount === 'string' && isPaymentAccount(obj.lastAccount)
      ? obj.lastAccount
      : null;

  const recentAccounts: PaymentAccount[] = [];
  if (Array.isArray(obj.recentAccounts)) {
    for (const entry of obj.recentAccounts) {
      if (
        typeof entry === 'string' &&
        isPaymentAccount(entry) &&
        !recentAccounts.includes(entry)
      ) {
        recentAccounts.push(entry);
        if (recentAccounts.length >= MAX_RECENT_ACCOUNTS) break;
      }
    }
  }

  return { lastChoice, lastAccount, recentAccounts };
}

export function loadCheckoutPrefs(): CheckoutPrefs {
  if (typeof window === 'undefined') return DEFAULT_CHECKOUT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CHECKOUT_PREFS;
    return sanitizeCheckoutPrefs(JSON.parse(raw));
  } catch {
    return DEFAULT_CHECKOUT_PREFS;
  }
}

export function saveCheckoutPrefs(patch: Partial<CheckoutPrefs>): CheckoutPrefs {
  const current = loadCheckoutPrefs();
  let recentAccounts = patch.recentAccounts ?? current.recentAccounts;

  if (patch.lastAccount && isPaymentAccount(patch.lastAccount)) {
    recentAccounts = [
      patch.lastAccount,
      ...recentAccounts.filter((acc) => acc !== patch.lastAccount),
    ].slice(0, MAX_RECENT_ACCOUNTS);
  }

  const next = sanitizeCheckoutPrefs({
    lastChoice: patch.lastChoice ?? current.lastChoice,
    lastAccount: patch.lastAccount !== undefined ? patch.lastAccount : current.lastAccount,
    recentAccounts,
  });

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota or Safari private-mode restrictions
    }
  }

  return next;
}

export function recordRecentPaymentAccount(account: PaymentAccount): PaymentAccount[] {
  const current = loadCheckoutPrefs();
  const recentAccounts = [
    account,
    ...current.recentAccounts.filter((acc) => acc !== account),
  ].slice(0, MAX_RECENT_ACCOUNTS);

  saveCheckoutPrefs({ recentAccounts });
  return recentAccounts;
}

/**
 * Returns up to 4 quick-pick accounts for collapsed display:
 * currently selected account (if any), followed by MRU recent accounts,
 * padded from DEFAULT_FEATURED_ACCOUNTS so the user always sees 3–4 familiar pills.
 */
export function getQuickPickAccounts(
  selected: PaymentAccount | null,
  recentAccounts: readonly PaymentAccount[],
  limit = 4
): PaymentAccount[] {
  const result: PaymentAccount[] = [];
  const pushUnique = (acc: PaymentAccount | null | undefined) => {
    if (!acc || result.includes(acc) || result.length >= limit) return;
    result.push(acc);
  };

  pushUnique(selected);
  for (const acc of recentAccounts) pushUnique(acc);
  for (const acc of DEFAULT_FEATURED_ACCOUNTS) {
    if (result.length >= Math.min(3, limit)) break;
    pushUnique(acc);
  }

  return result;
}
