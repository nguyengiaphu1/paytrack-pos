'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatErrorMessageVN } from '@/lib/errors';
import {
  EMPTY_POS_DRAFT,
  getPosDraftSnapshot,
  subscribePosDraft,
  updatePosDraft,
  type PosDraftState,
} from '@/lib/pos-draft';
import { useRealtimeSync, type SyncStatus } from '@/hooks/useRealtimeSync';
import type {
  AnalyticsSummary,
  CartItem,
  Customer,
  Order,
  Product,
  ShopProfile,
} from '@/types/database';

const ORDERS_PAGE_SIZE = 200;

interface PosDataContextValue {
  syncStatus: SyncStatus;
  products: Product[];
  productsLoaded: boolean;
  customers: Customer[];
  customersLoaded: boolean;
  orders: Order[];
  ordersLoaded: boolean;
  hasMoreOrders: boolean;
  loadingMoreOrders: boolean;
  profile: ShopProfile | null;
  profileLoaded: boolean;
  catalogError: string | null;
  customersError: string | null;
  ordersError: string | null;
  profileError: string | null;
  analyticsVersion: number;
  cart: CartItem[];
  discount: number;
  selectedCustomerId: string | null;
  addProductToCart: (product: Product) => void;
  setProductQtyInCart: (product: Product, nextQty: number) => void;
  syncProductInCart: (product: Product) => void;
  addQuickItemToCart: (item: CartItem) => void;
  updateCartItemQty: (key: string, nextQty: number) => void;
  removeCartItem: (key: string) => void;
  setCartDiscount: (discount: number) => void;
  setSelectedCustomerId: (customerId: string | null) => void;
  clearCartDraft: () => PosDraftState;
  restoreCartDraft: (snapshot: PosDraftState) => void;
  resetOrderDraftAfterSave: () => void;
  ensurePosCatalog: () => Promise<void>;
  refreshPosCatalog: () => Promise<void>;
  ensureCustomers: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  ensureOrders: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  loadMoreOrders: () => Promise<void>;
  ensureProfile: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  fetchAnalytics: (
    startIso: string,
    endIso: string,
    options?: { force?: boolean; paymentAccount?: string | null }
  ) => Promise<{ data: AnalyticsSummary | null; error: string | null }>;
  getCachedAnalytics: (
    startIso: string,
    endIso: string,
    paymentAccount?: string | null
  ) => AnalyticsSummary | null;
  upsertProductLocal: (product: Product) => void;
  upsertCustomerLocal: (customer: Customer) => void;
  upsertOrderLocal: (order: Order) => void;
  setProfileLocal: (profile: ShopProfile) => void;
  invalidateAfterMutation: () => void;
}

interface ShellPosContextValue {
  syncStatus: SyncStatus;
  profile: ShopProfile | null;
  productsCount: number;
  setProfileLocal: (profile: ShopProfile) => void;
  upsertProductLocal: (product: Product) => void;
}

const PosDataContext = createContext<PosDataContextValue | null>(null);
const ShellPosContext = createContext<ShellPosContextValue | null>(null);

interface PosDataProviderProps {
  initialProfile: ShopProfile | null;
  children: ReactNode;
}

export function PosDataProvider({ initialProfile, children }: PosDataProviderProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoaded, setCustomersLoaded] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [hasMoreOrders, setHasMoreOrders] = useState(false);
  const [loadingMoreOrders, setLoadingMoreOrders] = useState(false);

  const [profile, setProfile] = useState<ShopProfile | null>(initialProfile);
  const [profileLoaded, setProfileLoaded] = useState<boolean>(Boolean(initialProfile));

  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const draftUserId = profile?.user_id ?? initialProfile?.user_id ?? 'active';
  const subscribeDraft = useCallback(
    (listener: () => void) => subscribePosDraft(draftUserId, listener),
    [draftUserId]
  );
  const getDraftClient = useCallback(
    () => getPosDraftSnapshot(draftUserId),
    [draftUserId]
  );
  const draft = useSyncExternalStore(
    subscribeDraft,
    getDraftClient,
    () => EMPTY_POS_DRAFT
  );

  const addProductToCart = useCallback(
    (product: Product) => {
      updatePosDraft(draftUserId, (prev) => {
        const idx = prev.cart.findIndex((i) => i.key === product.id);
        const nextCart =
          idx >= 0
            ? prev.cart.map((item, i) =>
                i === idx
                  ? { ...item, quantity: Number((item.quantity + 1).toFixed(2)) }
                  : item
              )
            : [
                ...prev.cart,
                {
                  key: product.id,
                  product_id: product.id,
                  product_name: product.name,
                  unit: product.unit,
                  unit_price: product.price,
                  cost_price: product.cost_price,
                  quantity: 1,
                },
              ];
        return { ...prev, cart: nextCart };
      });
    },
    [draftUserId]
  );

  const setProductQtyInCart = useCallback(
    (product: Product, nextQty: number) => {
      updatePosDraft(draftUserId, (prev) => {
        if (nextQty <= 0) {
          return { ...prev, cart: prev.cart.filter((i) => i.key !== product.id) };
        }
        const idx = prev.cart.findIndex((i) => i.key === product.id);
        const nextCart =
          idx >= 0
            ? prev.cart.map((item, i) => (i === idx ? { ...item, quantity: nextQty } : item))
            : [
                ...prev.cart,
                {
                  key: product.id,
                  product_id: product.id,
                  product_name: product.name,
                  unit: product.unit,
                  unit_price: product.price,
                  cost_price: product.cost_price,
                  quantity: nextQty,
                },
              ];
        return { ...prev, cart: nextCart };
      });
    },
    [draftUserId]
  );

  const syncProductInCart = useCallback(
    (product: Product) => {
      updatePosDraft(draftUserId, (prev) => {
        if (!prev.cart.some((i) => i.product_id === product.id)) return prev;
        return {
          ...prev,
          cart: prev.cart.map((item) =>
            item.product_id === product.id
              ? {
                  ...item,
                  product_name: product.name,
                  unit: product.unit,
                  unit_price: product.price,
                  cost_price: product.cost_price,
                }
              : item
          ),
        };
      });
    },
    [draftUserId]
  );

  const addQuickItemToCart = useCallback(
    (item: CartItem) => {
      updatePosDraft(draftUserId, (prev) => ({
        ...prev,
        cart: [...prev.cart, item],
      }));
    },
    [draftUserId]
  );

  const updateCartItemQty = useCallback(
    (key: string, nextQty: number) => {
      updatePosDraft(draftUserId, (prev) => ({
        ...prev,
        cart: prev.cart.map((i) => (i.key === key ? { ...i, quantity: nextQty } : i)),
      }));
    },
    [draftUserId]
  );

  const removeCartItem = useCallback(
    (key: string) => {
      updatePosDraft(draftUserId, (prev) => ({
        ...prev,
        cart: prev.cart.filter((i) => i.key !== key),
      }));
    },
    [draftUserId]
  );

  const setCartDiscount = useCallback(
    (nextDiscount: number) => {
      updatePosDraft(draftUserId, (prev) => ({
        ...prev,
        discount: Math.max(0, Math.round(nextDiscount)),
      }));
    },
    [draftUserId]
  );

  const setSelectedCustomerId = useCallback(
    (customerId: string | null) => {
      updatePosDraft(draftUserId, (prev) => ({
        ...prev,
        selectedCustomerId: customerId,
      }));
    },
    [draftUserId]
  );

  const clearCartDraft = useCallback((): PosDraftState => {
    const previous = getPosDraftSnapshot(draftUserId);
    updatePosDraft(draftUserId, (prev) => ({
      ...prev,
      cart: [],
      discount: 0,
    }));
    return previous;
  }, [draftUserId]);

  const restoreCartDraft = useCallback(
    (snapshot: PosDraftState) => {
      updatePosDraft(draftUserId, () => snapshot);
    },
    [draftUserId]
  );

  const resetOrderDraftAfterSave = useCallback(() => {
    updatePosDraft(draftUserId, () => EMPTY_POS_DRAFT);
  }, [draftUserId]);

  const analyticsCacheRef = useRef<Map<string, AnalyticsSummary>>(new Map());
  const [analyticsVersion, setAnalyticsVersion] = useState(0);
  const ordersLimitRef = useRef(ORDERS_PAGE_SIZE);

  const loadedFlagsRef = useRef({
    products: false,
    customers: false,
    orders: false,
    profile: Boolean(initialProfile),
  });

  const inflightRef = useRef<{
    posCatalog: Promise<void> | null;
    customers: Promise<void> | null;
    orders: Promise<void> | null;
    profile: Promise<void> | null;
  }>({
    posCatalog: null,
    customers: null,
    orders: null,
    profile: null,
  });

  const refreshProfile = useCallback(async () => {
    if (inflightRef.current.profile) return inflightRef.current.profile;
    const task = (async () => {
      try {
        setProfileError(null);
        const supabase = createClient();
        const { data, error } = await supabase.from('shop_profiles').select('*').maybeSingle();
        if (error) throw error;
        if (data) setProfile(data as ShopProfile);
        loadedFlagsRef.current.profile = true;
        setProfileLoaded(true);
      } catch (err) {
        setProfileError(formatErrorMessageVN(err, 'Không tải được cài đặt cửa hàng.'));
      }
    })().finally(() => {
      inflightRef.current.profile = null;
    });
    inflightRef.current.profile = task;
    return task;
  }, []);

  const refreshPosCatalog = useCallback(async () => {
    if (inflightRef.current.posCatalog) return inflightRef.current.posCatalog;
    const task = (async () => {
      try {
        setCatalogError(null);
        const supabase = createClient();
        const [prodRes, custRes, profRes] = await Promise.all([
          supabase.from('products').select('*').order('name', { ascending: true }),
          supabase
            .from('customers')
            .select('*')
            .order('total_debt', { ascending: false })
            .order('name', { ascending: true }),
          loadedFlagsRef.current.profile
            ? Promise.resolve({ data: null, error: null })
            : supabase.from('shop_profiles').select('*').maybeSingle(),
        ]);

        if (prodRes.error) throw prodRes.error;
        if (custRes.error) throw custRes.error;
        if (profRes.error) throw profRes.error;

        if (prodRes.data) {
          setProducts(prodRes.data as Product[]);
          loadedFlagsRef.current.products = true;
          setProductsLoaded(true);
        }
        if (custRes.data) {
          setCustomers(custRes.data as Customer[]);
          loadedFlagsRef.current.customers = true;
          setCustomersLoaded(true);
        }
        if (profRes.data) {
          setProfile(profRes.data as ShopProfile);
          loadedFlagsRef.current.profile = true;
          setProfileLoaded(true);
        }
      } catch (err) {
        setCatalogError(formatErrorMessageVN(err, 'Không tải được danh sách sản phẩm.'));
      }
    })().finally(() => {
      inflightRef.current.posCatalog = null;
    });
    inflightRef.current.posCatalog = task;
    return task;
  }, []);

  const refreshCustomers = useCallback(async () => {
    if (inflightRef.current.customers) return inflightRef.current.customers;
    const task = (async () => {
      try {
        setCustomersError(null);
        const supabase = createClient();
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('total_debt', { ascending: false })
          .order('name', { ascending: true });
        if (error) throw error;
        if (data) {
          setCustomers(data as Customer[]);
          loadedFlagsRef.current.customers = true;
          setCustomersLoaded(true);
        }
      } catch (err) {
        setCustomersError(formatErrorMessageVN(err, 'Không tải được sổ nợ khách hàng.'));
      }
    })().finally(() => {
      inflightRef.current.customers = null;
    });
    inflightRef.current.customers = task;
    return task;
  }, []);

  const refreshOrders = useCallback(async () => {
    if (inflightRef.current.orders) return inflightRef.current.orders;
    const task = (async () => {
      try {
        setOrdersError(null);
        const supabase = createClient();
        const limit = ordersLimitRef.current;
        const { data, error } = await supabase
          .from('orders')
          .select(
            '*, order_items(id, user_id, order_id, product_id, product_name, unit, unit_price, cost_price, quantity, line_total)'
          )
          .order('purchased_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(limit + 1);
        if (error) throw error;
        if (data) {
          const rows = data as Order[];
          setHasMoreOrders(rows.length > limit);
          setOrders(rows.slice(0, limit));
          loadedFlagsRef.current.orders = true;
          setOrdersLoaded(true);
        }
      } catch (err) {
        setOrdersError(formatErrorMessageVN(err, 'Không tải được sổ bán hàng.'));
      }
    })().finally(() => {
      inflightRef.current.orders = null;
    });
    inflightRef.current.orders = task;
    return task;
  }, []);

  const loadMoreOrders = useCallback(async () => {
    if (loadingMoreOrders) return;
    setLoadingMoreOrders(true);
    ordersLimitRef.current += ORDERS_PAGE_SIZE;
    try {
      await refreshOrders();
    } finally {
      setLoadingMoreOrders(false);
    }
  }, [loadingMoreOrders, refreshOrders]);

  const ensurePosCatalog = useCallback(async () => {
    if (loadedFlagsRef.current.products && loadedFlagsRef.current.customers) return;
    await refreshPosCatalog();
  }, [refreshPosCatalog]);

  const ensureCustomers = useCallback(async () => {
    if (loadedFlagsRef.current.customers) return;
    await refreshCustomers();
  }, [refreshCustomers]);

  const ensureOrders = useCallback(async () => {
    if (loadedFlagsRef.current.orders) return;
    await refreshOrders();
  }, [refreshOrders]);

  const ensureProfile = useCallback(async () => {
    if (loadedFlagsRef.current.profile) return;
    await refreshProfile();
  }, [refreshProfile]);

  const getCachedAnalytics = useCallback(
    (startIso: string, endIso: string, paymentAccount?: string | null) => {
      const key = `${startIso}|${endIso}|${paymentAccount ?? ''}`;
      return analyticsCacheRef.current.get(key) ?? null;
    },
    []
  );

  const fetchAnalytics = useCallback(
    async (
      startIso: string,
      endIso: string,
      options?: { force?: boolean; paymentAccount?: string | null }
    ) => {
      const account = options?.paymentAccount || null;
      const key = `${startIso}|${endIso}|${account ?? ''}`;
      if (!options?.force && analyticsCacheRef.current.has(key)) {
        return { data: analyticsCacheRef.current.get(key) ?? null, error: null };
      }
      const supabase = createClient();
      const params: Record<string, string | null> = {
        p_start: startIso,
        p_end: endIso,
      };
      if (account) {
        params.p_payment_account = account;
      }
      const { data, error } = await supabase.rpc('get_analytics_summary', params);
      if (error) {
        return { data: null, error: formatErrorMessageVN(error, 'Không tải được thống kê.') };
      }
      const summary = data as AnalyticsSummary;
      analyticsCacheRef.current.set(key, summary);
      return { data: summary, error: null };
    },
    []
  );

  const upsertProductLocal = useCallback((product: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      const next = exists
        ? prev.map((p) => (p.id === product.id ? product : p))
        : [...prev, product];
      return next.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    });
    loadedFlagsRef.current.products = true;
    setProductsLoaded(true);
  }, []);

  const upsertCustomerLocal = useCallback((customer: Customer) => {
    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === customer.id);
      return exists
        ? prev.map((c) => (c.id === customer.id ? customer : c))
        : [customer, ...prev];
    });
    loadedFlagsRef.current.customers = true;
    setCustomersLoaded(true);
  }, []);

  const upsertOrderLocal = useCallback((order: Order) => {
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === order.id);
      const next = exists
        ? prev.map((o) =>
            o.id === order.id ? { ...o, ...order, order_items: order.order_items ?? o.order_items } : o
          )
        : [order, ...prev];
      return next.sort((a, b) => {
        const tA = new Date(a.purchased_at || a.created_at).getTime();
        const tB = new Date(b.purchased_at || b.created_at).getTime();
        return tB - tA;
      });
    });
    loadedFlagsRef.current.orders = true;
    setOrdersLoaded(true);
  }, []);

  const setProfileLocal = useCallback((nextProfile: ShopProfile) => {
    setProfile(nextProfile);
    loadedFlagsRef.current.profile = true;
    setProfileLoaded(true);
  }, []);

  const refreshLoadedSlices = useCallback(() => {
    analyticsCacheRef.current.clear();
    setAnalyticsVersion((v) => v + 1);

    const tasks: Array<Promise<void>> = [];
    if (loadedFlagsRef.current.products) {
      tasks.push(refreshPosCatalog());
    } else if (loadedFlagsRef.current.customers) {
      tasks.push(refreshCustomers());
    }
    if (loadedFlagsRef.current.orders) {
      tasks.push(refreshOrders());
    }
    if (loadedFlagsRef.current.profile) {
      tasks.push(refreshProfile());
    }
    void Promise.all(tasks);
  }, [refreshCustomers, refreshOrders, refreshPosCatalog, refreshProfile]);

  const invalidateAfterMutation = useCallback(() => {
    refreshLoadedSlices();
  }, [refreshLoadedSlices]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleRealtimeChange = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      refreshLoadedSlices();
      window.dispatchEvent(new CustomEvent('paytrack:realtime-update'));
    }, 250);
  }, [refreshLoadedSlices]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const { status: syncStatus } = useRealtimeSync({
    tables: ['products', 'customers', 'orders', 'debt_payments', 'debt_reminders', 'shop_profiles'],
    onDataChange: handleRealtimeChange,
    channelName: 'shell-sync',
  });

  const shellValue = useMemo<ShellPosContextValue>(
    () => ({
      syncStatus,
      profile,
      productsCount: products.length,
      setProfileLocal,
      upsertProductLocal,
    }),
    [syncStatus, profile, products.length, setProfileLocal, upsertProductLocal]
  );

  const value = useMemo<PosDataContextValue>(
    () => ({
      syncStatus,
      products,
      productsLoaded,
      customers,
      customersLoaded,
      orders,
      ordersLoaded,
      hasMoreOrders,
      loadingMoreOrders,
      profile,
      profileLoaded,
      catalogError,
      customersError,
      ordersError,
      profileError,
      analyticsVersion,
      cart: draft.cart,
      discount: draft.discount,
      selectedCustomerId: draft.selectedCustomerId,
      addProductToCart,
      setProductQtyInCart,
      syncProductInCart,
      addQuickItemToCart,
      updateCartItemQty,
      removeCartItem,
      setCartDiscount,
      setSelectedCustomerId,
      clearCartDraft,
      restoreCartDraft,
      resetOrderDraftAfterSave,
      ensurePosCatalog,
      refreshPosCatalog,
      ensureCustomers,
      refreshCustomers,
      ensureOrders,
      refreshOrders,
      loadMoreOrders,
      ensureProfile,
      refreshProfile,
      fetchAnalytics,
      getCachedAnalytics,
      upsertProductLocal,
      upsertCustomerLocal,
      upsertOrderLocal,
      setProfileLocal,
      invalidateAfterMutation,
    }),
    [
      syncStatus,
      products,
      productsLoaded,
      customers,
      customersLoaded,
      orders,
      ordersLoaded,
      hasMoreOrders,
      loadingMoreOrders,
      profile,
      profileLoaded,
      catalogError,
      customersError,
      ordersError,
      profileError,
      analyticsVersion,
      draft.cart,
      draft.discount,
      draft.selectedCustomerId,
      addProductToCart,
      setProductQtyInCart,
      syncProductInCart,
      addQuickItemToCart,
      updateCartItemQty,
      removeCartItem,
      setCartDiscount,
      setSelectedCustomerId,
      clearCartDraft,
      restoreCartDraft,
      resetOrderDraftAfterSave,
      ensurePosCatalog,
      refreshPosCatalog,
      ensureCustomers,
      refreshCustomers,
      ensureOrders,
      refreshOrders,
      loadMoreOrders,
      ensureProfile,
      refreshProfile,
      fetchAnalytics,
      getCachedAnalytics,
      upsertProductLocal,
      upsertCustomerLocal,
      upsertOrderLocal,
      setProfileLocal,
      invalidateAfterMutation,
    ]
  );

  return (
    <ShellPosContext.Provider value={shellValue}>
      <PosDataContext.Provider value={value}>{children}</PosDataContext.Provider>
    </ShellPosContext.Provider>
  );
}

export function useShellPosData(): ShellPosContextValue {
  const ctx = useContext(ShellPosContext);
  if (!ctx) {
    throw new Error('useShellPosData must be used inside PosDataProvider');
  }
  return ctx;
}

export function usePosData(): PosDataContextValue {
  const ctx = useContext(PosDataContext);
  if (!ctx) {
    throw new Error('usePosData must be used inside PosDataProvider');
  }
  return ctx;
}
