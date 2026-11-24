import type { CartItem } from '@/types/database';

export interface PosDraftState {
  cart: CartItem[];
  discount: number;
  selectedCustomerId: string | null;
}

export const EMPTY_POS_DRAFT: PosDraftState = {
  cart: [],
  discount: 0,
  selectedCustomerId: null,
};

const draftCache = new Map<string, PosDraftState>();
const draftListeners = new Map<string, Set<() => void>>();

export function getPosDraftStorageKey(userId?: string | null): string {
  const safeUser = userId && userId.trim() ? userId.trim() : 'active';
  return `paytrack:pos-draft:${safeUser}`;
}

export function sanitizeCartItem(raw: unknown): CartItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const key = typeof obj.key === 'string' && obj.key.trim() ? obj.key.trim() : '';
  const product_name =
    typeof obj.product_name === 'string' && obj.product_name.trim()
      ? obj.product_name.trim()
      : '';
  const unit = typeof obj.unit === 'string' && obj.unit.trim() ? obj.unit.trim() : 'cái';
  const unit_price =
    typeof obj.unit_price === 'number' && Number.isFinite(obj.unit_price) && obj.unit_price >= 0
      ? Math.round(obj.unit_price)
      : null;
  const quantity =
    typeof obj.quantity === 'number' && Number.isFinite(obj.quantity) && obj.quantity > 0
      ? Number(obj.quantity.toFixed(2))
      : null;

  if (!key || !product_name || unit_price === null || quantity === null) return null;

  const product_id =
    typeof obj.product_id === 'string' && obj.product_id.trim() ? obj.product_id.trim() : null;
  const cost_price =
    typeof obj.cost_price === 'number' && Number.isFinite(obj.cost_price) && obj.cost_price >= 0
      ? Math.round(obj.cost_price)
      : null;

  return {
    key,
    product_id,
    product_name,
    unit,
    unit_price,
    cost_price,
    quantity,
  };
}

export function sanitizePosDraft(raw: unknown): PosDraftState {
  if (!raw || typeof raw !== 'object') return EMPTY_POS_DRAFT;
  const obj = raw as Record<string, unknown>;
  const rawCart = Array.isArray(obj.cart) ? obj.cart : [];
  const cart: CartItem[] = [];
  const seenKeys = new Set<string>();

  for (const entry of rawCart) {
    const clean = sanitizeCartItem(entry);
    if (clean && !seenKeys.has(clean.key)) {
      seenKeys.add(clean.key);
      cart.push(clean);
    }
  }

  const discount =
    typeof obj.discount === 'number' && Number.isFinite(obj.discount) && obj.discount >= 0
      ? Math.round(obj.discount)
      : 0;

  const selectedCustomerId =
    typeof obj.selectedCustomerId === 'string' && obj.selectedCustomerId.trim()
      ? obj.selectedCustomerId.trim()
      : null;

  if (cart.length === 0 && discount === 0 && !selectedCustomerId) {
    return EMPTY_POS_DRAFT;
  }

  return { cart, discount, selectedCustomerId };
}

export function loadPosDraft(userId?: string | null): PosDraftState {
  if (typeof window === 'undefined') return EMPTY_POS_DRAFT;
  try {
    const raw = window.localStorage.getItem(getPosDraftStorageKey(userId));
    if (!raw) return EMPTY_POS_DRAFT;
    return sanitizePosDraft(JSON.parse(raw));
  } catch {
    return EMPTY_POS_DRAFT;
  }
}

export function savePosDraft(draft: PosDraftState, userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getPosDraftStorageKey(userId);
    if (draft.cart.length === 0 && draft.discount === 0 && !draft.selectedCustomerId) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Ignore storage quota or Safari private-mode restrictions
  }
}

function notifyDraftListeners(storageKey: string): void {
  const listeners = draftListeners.get(storageKey);
  if (!listeners) return;
  for (const listener of listeners) {
    listener();
  }
}

export function getPosDraftSnapshot(userId?: string | null): PosDraftState {
  if (typeof window === 'undefined') return EMPTY_POS_DRAFT;
  const storageKey = getPosDraftStorageKey(userId);
  const cached = draftCache.get(storageKey);
  if (cached) return cached;
  const loaded = loadPosDraft(userId);
  draftCache.set(storageKey, loaded);
  return loaded;
}

export function updatePosDraft(
  userId: string | null | undefined,
  updater: (prev: PosDraftState) => PosDraftState
): void {
  const storageKey = getPosDraftStorageKey(userId);
  const current = getPosDraftSnapshot(userId);
  const next = sanitizePosDraft(updater(current));
  draftCache.set(storageKey, next);
  savePosDraft(next, userId);
  notifyDraftListeners(storageKey);
}

export function subscribePosDraft(
  userId: string | null | undefined,
  listener: () => void
): () => void {
  const storageKey = getPosDraftStorageKey(userId);
  let set = draftListeners.get(storageKey);
  if (!set) {
    set = new Set();
    draftListeners.set(storageKey, set);
  }
  set.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey) return;
    draftCache.set(storageKey, loadPosDraft(userId));
    notifyDraftListeners(storageKey);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }

  return () => {
    set?.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}

/**
 * Strips non-numeric characters while keeping a single decimal separator (`.` or `,`)
 * so mobile users can clear the field and type decimal quantities naturally.
 */
export function sanitizeQtyInput(raw: string): string {
  const normalized = raw.replace(/,/g, '.');
  let out = '';
  let hasDot = false;
  for (const ch of normalized) {
    if (ch >= '0' && ch <= '9') {
      out += ch;
    } else if (ch === '.' && !hasDot) {
      hasDot = true;
      out += ch;
    }
  }
  return out;
}

export function parseQtyDraft(text: string): number | null {
  const cleaned = sanitizeQtyInput(text).trim();
  if (!cleaned || cleaned === '.') return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Number(num.toFixed(2));
}

export function formatQtyForInput(qty: number): string {
  if (!Number.isFinite(qty) || qty <= 0) return '1';
  return String(Number(qty.toFixed(2)));
}
