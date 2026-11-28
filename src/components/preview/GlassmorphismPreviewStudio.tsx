'use client';

import { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronUp,
  Clock,
  Layers,
  Loader2,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  Save,
  Search,
  Settings,
  ShoppingBag,
  Users,
  X,
} from 'lucide-react';
import type { CartItem, Customer, PaymentAccount, PaymentStatus, Product } from '@/types/database';
import { formatVND, stripVietnamese } from '@/lib/vietnamese';
import { ensureGsapInitialized, Flip, gsap, GSAP_MOTION, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { AnimatedSwap } from '@/components/ui/AnimatedSwap';
import { AnimatedVnd } from '@/components/ui/AnimatedVnd';
import { BrandMark } from '@/components/ui/BrandMark';
import { ThemeQuickToggle, SettingsThemeSelector } from '@/components/ui/ThemeToggle';
import { ProductCard } from '@/components/pos/ProductCard';
import { CartPanel } from '@/components/pos/CartPanel';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { OrderStatusBadge } from '@/components/ui/OrderStatusBadge';
import { PaymentAccountSelector } from '@/components/ui/PaymentAccountSelector';
import { VndKInput } from '@/components/ui/VndKInput';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { FetchErrorCard, PosWorkspaceSkeleton } from '@/components/ui/PageSkeletons';

type PreviewTab = 'pos' | 'debts' | 'orders' | 'stats' | 'settings';
type AuditStateDemo = 'success' | 'loading' | 'empty' | 'error';
type ActionBtnState = 'idle' | 'saving' | 'saved';

const PREVIEW_TABS: ReadonlyArray<{ id: PreviewTab; label: string; icon: typeof ShoppingBag }> = [
  { id: 'pos', label: 'Bán hàng', icon: ShoppingBag },
  { id: 'debts', label: 'Công nợ', icon: Users },
  { id: 'orders', label: 'Sổ bán', icon: ReceiptText },
  { id: 'stats', label: 'Thống kê', icon: BarChart3 },
  { id: 'settings', label: 'Cài đặt', icon: Settings },
];

const DEMO_PRODUCTS: Product[] = [
  {
    id: 'p1',
    user_id: 'preview',
    name: 'Mật ong hoa nhãn nguyên chất',
    search_text: 'mat ong hoa nhan nguyen chat',
    unit: 'chai',
    price: 280000,
    cost_price: 205000,
    category: 'Đặc sản',
    sku: 'MO-01',
    is_active: true,
    created_at: '2026-11-28T00:00:00Z',
    updated_at: '2026-11-28T00:00:00Z',
  },
  {
    id: 'p2',
    user_id: 'preview',
    name: 'Hạt điều rang muối Bình Phước',
    search_text: 'hat dieu rang muoi binh phuoc',
    unit: 'hộp',
    price: 165000,
    cost_price: 120000,
    category: 'Đồ khô',
    sku: 'HD-02',
    is_active: true,
    created_at: '2026-11-28T00:00:00Z',
    updated_at: '2026-11-28T00:00:00Z',
  },
  {
    id: 'p3',
    user_id: 'preview',
    name: 'Trà ô long sâm dứa Bảo Lộc',
    search_text: 'tra o long sam dua bao loc',
    unit: 'gói',
    price: 95000,
    cost_price: 65000,
    category: 'Đồ uống',
    sku: 'TR-03',
    is_active: true,
    created_at: '2026-11-28T00:00:00Z',
    updated_at: '2026-11-28T00:00:00Z',
  },
  {
    id: 'p4',
    user_id: 'preview',
    name: 'Nước mắm nhĩ Phú Quốc 40 độ',
    search_text: 'nuoc mam nhi phu quoc 40 do',
    unit: 'chai',
    price: 145000,
    cost_price: 105000,
    category: 'Gia vị',
    sku: 'NM-04',
    is_active: true,
    created_at: '2026-11-28T00:00:00Z',
    updated_at: '2026-11-28T00:00:00Z',
  },
  {
    id: 'p5',
    user_id: 'preview',
    name: 'Khô bò miếng Tây Nguyên',
    search_text: 'kho bo mieng tay nguyen',
    unit: 'túi',
    price: 220000,
    cost_price: 168000,
    category: 'Đồ khô',
    sku: 'KB-05',
    is_active: true,
    created_at: '2026-11-28T00:00:00Z',
    updated_at: '2026-11-28T00:00:00Z',
  },
  {
    id: 'p6',
    user_id: 'preview',
    name: 'Yến chưng đường phèn hũ lẻ',
    search_text: 'yen chung duong phen hu le',
    unit: 'hũ',
    price: 65000,
    cost_price: 44000,
    category: 'Đặc sản',
    sku: 'YC-06',
    is_active: true,
    created_at: '2026-11-28T00:00:00Z',
    updated_at: '2026-11-28T00:00:00Z',
  },
  {
    id: 'p7',
    user_id: 'preview',
    name: 'Cà phê rang mộc Buôn Ma Thuột',
    search_text: 'ca phe rang moc buon ma thuot',
    unit: 'gói',
    price: 135000,
    cost_price: 92000,
    category: 'Đồ uống',
    sku: 'CP-07',
    is_active: true,
    created_at: '2026-11-28T00:00:00Z',
    updated_at: '2026-11-28T00:00:00Z',
  },
  {
    id: 'p8',
    user_id: 'preview',
    name: 'Tôm khô Cà Mau loại 1',
    search_text: 'tom kho ca mau loai 1',
    unit: 'hộp',
    price: 390000,
    cost_price: 305000,
    category: 'Đồ khô',
    sku: 'TK-08',
    is_active: true,
    created_at: '2026-11-28T00:00:00Z',
    updated_at: '2026-11-28T00:00:00Z',
  },
  {
    id: 'p9',
    user_id: 'preview',
    name: 'Muối tôm Tây Ninh đặc biệt',
    search_text: 'muoi tom tay ninh dac biet',
    unit: 'hũ',
    price: 55000,
    cost_price: 35000,
    category: 'Gia vị',
    sku: 'MT-09',
    is_active: true,
    created_at: '2026-11-28T00:00:00Z',
    updated_at: '2026-11-28T00:00:00Z',
  },
];

const DEMO_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    user_id: 'preview',
    name: 'Chị Lan Anh (Quận 3)',
    search_text: 'chi lan anh quan 3',
    phone: '0908 412 889',
    address: '214 Nguyễn Đình Chiểu, Q.3',
    note: null,
    total_debt: 740000,
    next_due_date: '2026-11-26',
    created_at: '2026-11-20T00:00:00Z',
    updated_at: '2026-11-28T00:00:00Z',
  },
  {
    id: 'c2',
    user_id: 'preview',
    name: 'Anh Minh Tuấn',
    search_text: 'anh minh tuan',
    phone: '0913 778 210',
    address: '89 Lê Văn Sỹ, Phú Nhuận',
    note: null,
    total_debt: 385000,
    next_due_date: '2026-11-28',
    created_at: '2026-11-22T00:00:00Z',
    updated_at: '2026-11-28T00:00:00Z',
  },
  {
    id: 'c3',
    user_id: 'preview',
    name: 'Cô Thu Hà',
    search_text: 'co thu ha',
    phone: '0989 102 334',
    address: '15 Võ Thị Sáu, Q.1',
    note: null,
    total_debt: 0,
    next_due_date: null,
    created_at: '2026-11-18T00:00:00Z',
    updated_at: '2026-11-28T00:00:00Z',
  },
];

const DEMO_ORDERS: Array<{
  code: string;
  customer: string;
  itemsSummary: string;
  total: number;
  paid: number;
  remaining: number;
  profit: number;
  account: PaymentAccount;
  status: PaymentStatus;
  dateLabel: string;
}> = [
  {
    code: 'DH-20261128-0104',
    customer: 'Cô Thu Hà',
    itemsSummary: '2x Mật ong hoa nhãn, 1x Trà ô long',
    total: 655000,
    paid: 655000,
    remaining: 0,
    profit: 180000,
    account: 'Trang',
    status: 'paid',
    dateLabel: '28/11 10:15',
  },
  {
    code: 'DH-20261128-0103',
    customer: 'Anh Minh Tuấn',
    itemsSummary: '1x Khô bò miếng, 1x Hạt điều rang muối',
    total: 385000,
    paid: 0,
    remaining: 385000,
    profit: 97000,
    account: 'Phú',
    status: 'unpaid',
    dateLabel: '28/11 09:42',
  },
  {
    code: 'DH-20261127-0098',
    customer: 'Chị Lan Anh (Quận 3)',
    itemsSummary: '2x Mật ong hoa nhãn, 2x Nước mắm nhĩ',
    total: 850000,
    paid: 110000,
    remaining: 740000,
    profit: 230000,
    account: 'Thanh',
    status: 'partial',
    dateLabel: '27/11 19:20',
  },
];

const STATS_PRESET_DATA = {
  today: {
    profit: 1420000,
    cost: 4180000,
    revenue: 5600000,
    orders: 7,
    avg: 800000,
    margin: 25,
    collected: 4320000,
    cashPct: 44,
    transferPct: 56,
    debt: 16800000,
    newDebt: 1280000,
  },
  '7d': {
    profit: 11086000,
    cost: 37234000,
    revenue: 48320000,
    orders: 45,
    avg: 1073778,
    margin: 23,
    collected: 31520000,
    cashPct: 38,
    transferPct: 62,
    debt: 16800000,
    newDebt: 3200000,
  },
  '30d': {
    profit: 42650000,
    cost: 138450000,
    revenue: 181100000,
    orders: 168,
    avg: 1077976,
    margin: 24,
    collected: 164300000,
    cashPct: 31,
    transferPct: 69,
    debt: 16800000,
    newDebt: 9850000,
  },
} as const;

export function GlassmorphismPreviewStudio() {
  const [activeTab, setActiveTab] = useState<PreviewTab>('pos');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('ALL');
  const [editMode, setEditMode] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([
    {
      key: 'p1',
      product_id: 'p1',
      product_name: 'Mật ong hoa nhãn nguyên chất',
      unit: 'chai',
      unit_price: 280000,
      cost_price: 205000,
      quantity: 2,
    },
    {
      key: 'p2',
      product_id: 'p2',
      product_name: 'Hạt điều rang muối Bình Phước',
      unit: 'hộp',
      unit_price: 165000,
      cost_price: 120000,
      quantity: 1,
    },
  ]);
  const [discount, setDiscount] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(DEMO_CUSTOMERS[0]);

  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [collectModalCustomer, setCollectModalCustomer] = useState<Customer | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  const [checkoutAccount, setCheckoutAccount] = useState<PaymentAccount | null>('Trang');
  const [checkoutAccountNote, setCheckoutAccountNote] = useState('');
  const [collectAmount, setCollectAmount] = useState<number | null>(385000);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const [debtFilter, setDebtFilter] = useState<'debtors' | 'due' | 'all'>('debtors');
  const [statsPreset, setStatsPreset] = useState<'today' | '7d' | '30d'>('7d');
  const [auditState, setAuditState] = useState<AuditStateDemo>('success');
  const [actionBtnState, setActionBtnState] = useState<ActionBtnState>('idle');
  const [shopNameDraft, setShopNameDraft] = useState('Shop của Mẹ');

  const studioRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const dockRef = useRef<HTMLElement>(null);
  const dockPillRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const flipStateRef = useRef<Flip.FlipState | null>(null);
  const prevTabIndexRef = useRef(0);
  const pillBootedRef = useRef(false);

  const activeTabIndex = PREVIEW_TABS.findIndex((t) => t.id === activeTab);

  useGSAP(
    () => {
      ensureGsapInitialized();
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const bootTl = gsap.timeline();
        if (headerRef.current) {
          bootTl.from(
            headerRef.current,
            {
              y: -18,
              autoAlpha: 0,
              duration: GSAP_MOTION.duration.enter,
              ease: GSAP_MOTION.ease.bouncySoft,
              clearProps: 'transform,opacity,visibility',
            },
            0
          );

          ScrollTrigger.create({
            start: 18,
            end: 'max',
            onEnter: () => {
              if (!headerRef.current) return;
              gsap.to(headerRef.current, {
                scale: 0.992,
                duration: 0.24,
                ease: GSAP_MOTION.ease.smooth,
              });
            },
            onLeaveBack: () => {
              if (!headerRef.current) return;
              gsap.to(headerRef.current, {
                scale: 1,
                duration: 0.24,
                ease: GSAP_MOTION.ease.smooth,
                clearProps: 'transform',
              });
            },
          });
        }
        if (dockRef.current) {
          bootTl.from(
            dockRef.current,
            {
              y: 28,
              scale: 0.94,
              autoAlpha: 0,
              duration: 0.44,
              ease: GSAP_MOTION.ease.bouncySoft,
              clearProps: 'transform,opacity,visibility',
            },
            0.06
          );
        }
      });
      return () => mm.revert();
    },
    { scope: studioRef }
  );

  useGSAP(
    () => {
      ensureGsapInitialized();
      const navEl = dockRef.current;
      const pillEl = dockPillRef.current;
      if (!navEl || !pillEl) return;

      const positionPill = (animate: boolean) => {
        const activeBtn = navEl.querySelector<HTMLElement>('[aria-current="page"]');
        if (!activeBtn) return;
        const x = activeBtn.offsetLeft;
        const y = activeBtn.offsetTop;
        const width = activeBtn.offsetWidth;
        const height = activeBtn.offsetHeight;

        if (!animate) {
          gsap.set(pillEl, { x, y, width, height, autoAlpha: 1 });
          return;
        }

        const mm = gsap.matchMedia();
        mm.add(
          { reduceMotion: '(prefers-reduced-motion: reduce)' },
          (context) => {
            if (context.conditions?.reduceMotion) {
              gsap.set(pillEl, { x, y, width, height, autoAlpha: 1 });
              return;
            }
            const dockTl = gsap.timeline();
            dockTl
              .to(
                pillEl,
                {
                  x,
                  y,
                  width,
                  height,
                  autoAlpha: 1,
                  duration: 0.4,
                  ease: GSAP_MOTION.ease.bouncySoft,
                },
                0
              )
              .fromTo(
                pillEl,
                { scaleX: 1.08, scaleY: 0.92 },
                {
                  scaleX: 1,
                  scaleY: 1,
                  duration: 0.36,
                  ease: GSAP_MOTION.ease.bouncy,
                  clearProps: 'scaleX,scaleY',
                },
                0
              );

            const icon = activeBtn.querySelector<SVGSVGElement>('svg');
            if (icon) {
              dockTl.fromTo(
                icon,
                { y: -6, scale: 1.18 },
                {
                  y: 0,
                  scale: 1,
                  duration: 0.36,
                  ease: GSAP_MOTION.ease.bouncySnap,
                  clearProps: 'transform',
                },
                0.03
              );
            }
          }
        );
      };

      const shouldAnimate = pillBootedRef.current;
      pillBootedRef.current = true;
      positionPill(shouldAnimate);

      const ro =
        typeof ResizeObserver !== 'undefined'
          ? new ResizeObserver(() => positionPill(false))
          : null;
      ro?.observe(navEl);
      return () => ro?.disconnect();
    },
    { scope: dockRef, dependencies: [activeTabIndex] }
  );

  useGSAP(
    () => {
      ensureGsapInitialized();
      const prevIdx = prevTabIndexRef.current;
      if (prevIdx === activeTabIndex) return;
      prevTabIndexRef.current = activeTabIndex;

      const stage = stageRef.current;
      if (!stage) return;
      const direction = activeTabIndex > prevIdx ? 1 : -1;

      const mm = gsap.matchMedia();
      mm.add(
        { reduceMotion: '(prefers-reduced-motion: reduce)' },
        (context) => {
          if (context.conditions?.reduceMotion) {
            gsap.fromTo(
              stage,
              { opacity: 0 },
              { opacity: 1, duration: GSAP_MOTION.duration.reduced, clearProps: 'opacity' }
            );
            return;
          }

          const pageTl = gsap.timeline({
            onComplete: () => ScrollTrigger.refresh(),
          });

          pageTl.fromTo(
            stage,
            { x: direction * 34, autoAlpha: 0 },
            {
              x: 0,
              autoAlpha: 1,
              duration: GSAP_MOTION.duration.pageIn,
              ease: GSAP_MOTION.ease.enter,
              clearProps: 'transform,opacity,visibility',
            },
            0
          );

          const heading = stage.querySelector<HTMLElement>('h1');
          if (heading) {
            pageTl.from(
              heading,
              {
                y: 14,
                autoAlpha: 0,
                duration: 0.32,
                ease: GSAP_MOTION.ease.bouncy,
                clearProps: 'transform,opacity,visibility',
              },
              0.04
            );
          }

          const cards = Array.from(
            stage.querySelectorAll<HTMLElement>('.glass-panel, .glass-surface, .glass-card')
          ).slice(0, 12);
          if (cards.length > 0) {
            pageTl.from(
              cards,
              {
                y: 20,
                scale: 0.975,
                autoAlpha: 0,
                duration: 0.36,
                stagger: { amount: GSAP_MOTION.stagger.gridWave, from: 'start' },
                ease: GSAP_MOTION.ease.bouncySoft,
                clearProps: 'transform,opacity,visibility',
              },
              0.05
            );
          }
        }
      );

      return () => mm.revert();
    },
    { scope: stageRef, dependencies: [activeTabIndex] }
  );

  // FLIP grid reflow animation whenever category filter changes on POS tab
  useGSAP(
    () => {
      ensureGsapInitialized();
      const state = flipStateRef.current;
      flipStateRef.current = null;
      const gridEl = gridRef.current;
      if (!state || !gridEl) return;

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const cards = gridEl.querySelectorAll('.pos-flip-card');
        if (cards.length === 0) return;
        Flip.from(state, {
          targets: cards,
          duration: 0.42,
          ease: GSAP_MOTION.ease.flip,
          stagger: 0.025,
          scale: true,
          simple: true,
          onEnter: (els) =>
            gsap.fromTo(
              els,
              { opacity: 0, y: 18, scale: 0.94 },
              {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.34,
                ease: GSAP_MOTION.ease.bouncySoft,
                clearProps: 'transform,opacity',
              }
            ),
          onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.94, duration: 0.18 }),
        });
      });

      return () => mm.revert();
    },
    { scope: gridRef, dependencies: [category] }
  );

  const categories = useMemo(
    () => ['ALL', 'Đặc sản', 'Đồ khô', 'Đồ uống', 'Gia vị'],
    []
  );

  const filteredProducts = useMemo(() => {
    const q = stripVietnamese(query);
    return DEMO_PRODUCTS.filter((p) => {
      if (category !== 'ALL' && p.category !== category) return false;
      if (q && !p.search_text.includes(q)) return false;
      return true;
    });
  }, [query, category]);

  const cartQtyByProductId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cart) {
      if (item.product_id) map[item.product_id] = item.quantity;
    }
    return map;
  }, [cart]);

  const cartTotal = useMemo(
    () => Math.max(0, cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0) - discount),
    [cart, discount]
  );

  function addProduct(prod: Product) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.key === prod.id);
      if (idx >= 0) {
        return prev.map((item, i) =>
          i === idx ? { ...item, quantity: Number((item.quantity + 1).toFixed(2)) } : item
        );
      }
      return [
        ...prev,
        {
          key: prod.id,
          product_id: prod.id,
          product_name: prod.name,
          unit: prod.unit,
          unit_price: prod.price,
          cost_price: prod.cost_price,
          quantity: 1,
        },
      ];
    });
  }

  function setProductQty(prod: Product, nextQty: number) {
    if (nextQty <= 0) {
      setCart((prev) => prev.filter((i) => i.key !== prod.id));
      return;
    }
    setCart((prev) => {
      const exists = prev.some((i) => i.key === prod.id);
      if (!exists) {
        return [
          ...prev,
          {
            key: prod.id,
            product_id: prod.id,
            product_name: prod.name,
            unit: prod.unit,
            unit_price: prod.price,
            cost_price: prod.cost_price,
            quantity: nextQty,
          },
        ];
      }
      return prev.map((i) => (i.key === prod.id ? { ...i, quantity: nextQty } : i));
    });
  }

  function updateCartQty(key: string, nextQty: number) {
    if (nextQty <= 0) {
      setCart((prev) => prev.filter((i) => i.key !== key));
      return;
    }
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: nextQty } : i)));
  }

  function handleCycleActionBtn() {
    if (actionBtnState === 'idle') {
      setActionBtnState('saving');
      window.setTimeout(() => setActionBtnState('saved'), 650);
      window.setTimeout(() => setActionBtnState('idle'), 2400);
    } else if (actionBtnState === 'saved') {
      setActionBtnState('idle');
    }
  }

  const filteredCustomers = useMemo(() => {
    return DEMO_CUSTOMERS.filter((c) => {
      if (debtFilter === 'debtors') return c.total_debt > 0;
      if (debtFilter === 'due') return c.total_debt > 0 && Boolean(c.next_due_date);
      return true;
    });
  }, [debtFilter]);

  const activeStats = STATS_PRESET_DATA[statsPreset];

  return (
    <div ref={studioRef} className="relative flex min-h-dvh flex-col text-[var(--text-primary)]">
      {/* Sticky Frosted Glass Top Bar */}
      <div className="no-print sticky top-0 z-20 px-2.5 pt-2.5 sm:px-5 sm:pt-3">
        <header
          ref={headerRef}
          className="glass-surface mx-auto flex h-[60px] max-w-[1440px] items-center justify-between gap-2 rounded-[24px] px-3 sm:px-4"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="glass-icon-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] p-0.5">
              <BrandMark className="h-8 w-8 shrink-0" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold tracking-[-0.015em] text-[var(--text-primary)] sm:text-[16px]">
                {shopNameDraft}
              </p>
            </div>
            <span className="glass-badge-neutral hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold sm:inline-flex">
              <Layers className="h-3.5 w-3.5 text-[var(--brand-jade-text)]" />
              <span>Bản xem trước UI/UX</span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div
              role="status"
              aria-live="polite"
              className="glass-badge-paid inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold sm:px-3"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-paid)]" />
              <span>Đã đồng bộ</span>
            </div>
            <ThemeQuickToggle responsiveLabel />
          </div>
        </header>
      </div>

      {/* Main Content Stage */}
      <main className="min-w-0 flex-1 pb-[128px] lg:pb-[124px]">
        <div ref={stageRef}>
          {savedToast && (
            <div className="mx-auto mt-3 max-w-[1440px] px-3 sm:px-6">
              <div
                role="status"
                data-gsap-toast="preview-toast"
                className="glass-badge-paid flex items-center justify-between gap-2 rounded-[18px] px-4 py-2.5 text-[14px] font-semibold"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{savedToast}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSavedToast(null)}
                  aria-label="Đóng thông báo"
                  className="glass-solid-control press-tactile flex h-11 w-11 items-center justify-center rounded-full"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'pos' && (
            <div className="mx-auto max-w-[1440px] px-3 py-2.5 sm:px-6 sm:py-3.5">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--text-primary)] lg:text-[24px]">
                  Bán hàng
                </h1>
                <button
                  type="button"
                  onClick={() => setActiveTab('debts')}
                  className="glass-badge-debt glass-card-interactive press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold"
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <span>2 khách đến hạn</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12 lg:items-start lg:gap-5">
                <div className="min-w-0 space-y-2.5 sm:space-y-3 lg:col-span-7 xl:col-span-8">
                  {/* Customer Bar with AnimatedSwap */}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCustomer((prev) =>
                        prev?.id === DEMO_CUSTOMERS[0].id
                          ? DEMO_CUSTOMERS[1]
                          : prev?.id === DEMO_CUSTOMERS[1].id
                            ? DEMO_CUSTOMERS[2]
                            : DEMO_CUSTOMERS[0]
                      )
                    }
                    className="glass-card glass-card-interactive flex min-h-[56px] w-full items-center justify-between gap-3 rounded-[22px] px-4 py-2.5 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="glass-icon-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--brand-jade-text)]">
                        <Users className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <AnimatedSwap swapKey={selectedCustomer?.id ?? 'guest'} direction="up">
                          <span className="truncate text-[15px] font-bold text-[var(--text-primary)]">
                            {selectedCustomer ? selectedCustomer.name : 'Khách lẻ'}
                          </span>
                        </AnimatedSwap>
                        <p className="font-mono-tabular truncate text-[12px] text-[var(--text-secondary)]">
                          {selectedCustomer?.phone ?? 'Chạm để đổi khách mẫu'}
                        </p>
                      </div>
                    </div>
                    {selectedCustomer && selectedCustomer.total_debt > 0 && (
                      <AnimatedSwap swapKey={selectedCustomer.total_debt} direction="down">
                        <span className="glass-badge-debt font-mono-tabular shrink-0 rounded-full px-3 py-1 text-[12px] font-bold">
                          Nợ {formatVND(selectedCustomer.total_debt)}
                        </span>
                      </AnimatedSwap>
                    )}
                  </button>

                  {/* Search Tray */}
                  <div className="glass-surface flex items-center gap-2 rounded-[24px] p-2 sm:p-2.5">
                    <div className="relative min-w-0 flex-1">
                      <Search
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
                      />
                      <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label="Tìm món hàng mẫu"
                        placeholder="Tìm món..."
                        className="glass-input min-h-[46px] w-full rounded-full pr-4 pl-10 text-[16px] text-[var(--text-primary)] outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditMode((v) => !v)}
                      aria-pressed={editMode}
                      className={`press-tactile inline-flex min-h-[46px] shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold ${
                        editMode ? 'glass-chip-active' : 'glass-solid-control text-[var(--text-primary)]'
                      }`}
                    >
                      <AnimatedSwap
                        swapKey={editMode ? 'done' : 'edit'}
                        direction={editMode ? 'up' : 'down'}
                      >
                        {editMode ? (
                          <>
                            <Check className="h-4 w-4 shrink-0" />
                            <span>Xong</span>
                          </>
                        ) : (
                          <>
                            <Pencil className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
                            <span>Sửa</span>
                          </>
                        )}
                      </AnimatedSwap>
                    </button>
                  </div>

                  {/* Category Chips (Flip Reflow on click) */}
                  <div className="scrollbar-none scroll-fade-x flex items-center gap-1.5 overflow-x-auto py-0.5">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        aria-pressed={category === cat}
                        onClick={() => {
                          ensureGsapInitialized();
                          const gridEl = gridRef.current;
                          if (gridEl) {
                            const cards = gridEl.querySelectorAll('.pos-flip-card');
                            if (cards.length > 0) {
                              flipStateRef.current = Flip.getState(cards);
                            }
                          }
                          setCategory(cat);
                        }}
                        className={`press-tactile min-h-[44px] shrink-0 whitespace-nowrap rounded-full px-3.5 text-[13px] ${
                          category === cat ? 'glass-chip-active font-semibold' : 'glass-chip font-medium'
                        }`}
                      >
                        {cat === 'ALL' ? 'Tất cả' : cat}
                      </button>
                    ))}
                  </div>

                  {/* Product Grid */}
                  <div
                    ref={gridRef}
                    className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:items-stretch xl:grid-cols-3"
                  >
                    {filteredProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        qty={cartQtyByProductId[product.id] ?? 0}
                        editMode={editMode}
                        onAdd={addProduct}
                        onSetQty={setProductQty}
                        onEdit={() =>
                          setSavedToast(`Đã bấm sửa "${product.name}" (chế độ xem trước).`)
                        }
                      />
                    ))}
                  </div>

                  {/* Below-the-fold ScrollTrigger.batch Showcase Strip */}
                  <div
                    data-gsap-scroll="pos-summary-footer"
                    className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-[22px] p-4"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-[var(--text-primary)]">
                        Mẹo thao tác nhanh POS
                      </p>
                      <p className="text-[12px] text-[var(--text-secondary)]">
                        Chạm thẻ món để thêm nhanh · Lọc danh mục để xem hiệu ứng GSAP Flip · Bấm Sửa để lật icon &amp; chữ.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOrderModalOpen(true)}
                      className="glass-solid-control press-tactile min-h-[44px] shrink-0 rounded-full px-4 text-[13px] font-semibold text-[var(--text-primary)]"
                    >
                      Xem hóa đơn mẫu
                    </button>
                  </div>
                </div>

                {/* Desktop Sticky Cart Panel */}
                <div className="hidden lg:col-span-5 lg:block xl:col-span-4">
                  <div className="lg:sticky lg:top-[76px] lg:flex lg:max-h-[calc(100dvh-212px)] lg:flex-col">
                    <CartPanel
                      items={cart}
                      discount={discount}
                      discountInputId="preview-cart-discount-desktop"
                      onChangeDiscount={setDiscount}
                      onUpdateQty={updateCartQty}
                      onRemoveItem={(key) => setCart((prev) => prev.filter((i) => i.key !== key))}
                      onClearCart={() => setCart([])}
                      selectedCustomer={selectedCustomer}
                      onOpenCustomerPicker={() =>
                        setSelectedCustomer((prev) =>
                          prev?.id === DEMO_CUSTOMERS[0].id ? DEMO_CUSTOMERS[2] : DEMO_CUSTOMERS[0]
                        )
                      }
                      onOpenCheckout={() => setCheckoutModalOpen(true)}
                    />
                  </div>
                </div>
              </div>

              {/* Mobile Floating Cart Pill */}
              {cart.length > 0 && (
                <div className="pointer-events-none fixed inset-x-0 bottom-[calc(90px+env(safe-area-inset-bottom))] z-20 flex justify-center px-3 lg:hidden">
                  <div className="glass-dock pointer-events-auto flex w-full max-w-[440px] items-center gap-1.5 rounded-full p-1.5">
                    <button
                      type="button"
                      onClick={() => setMobileCartOpen(true)}
                      className="press-tactile flex min-h-[48px] min-w-0 flex-1 items-center gap-2 rounded-full px-2 text-left"
                    >
                      <span className="glass-icon-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--brand-jade-text)]">
                        <ShoppingBag className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 text-[12px] font-semibold text-[var(--text-secondary)]">
                          <AnimatedSwap swapKey={cart.length} direction="up">
                            <span className="truncate">{cart.length} món</span>
                          </AnimatedSwap>
                          <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                        </div>
                        <p className="font-mono-tabular truncate text-[15px] font-bold text-[var(--brand-jade-text)]">
                          <AnimatedVnd value={cartTotal} />
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutModalOpen(true)}
                      className="glass-btn-primary press-tactile flex min-h-[48px] shrink-0 items-center justify-center rounded-full px-5 text-[15px] font-bold"
                    >
                      Chốt đơn
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'debts' && (
            <div className="mx-auto max-w-[1160px] px-3 py-4 sm:px-6 lg:py-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h1 className="text-[22px] font-bold tracking-[-0.015em] text-[var(--text-primary)] lg:text-[24px]">
                  Công nợ
                </h1>
                <span className="glass-badge-debt inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold">
                  <Users className="h-3.5 w-3.5" />
                  <span>2 khách đang nợ</span>
                </span>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="glass-card col-span-2 min-w-0 rounded-[22px] p-4 sm:col-span-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-[var(--text-secondary)]">Tổng phải thu</p>
                    <span className="glass-badge-debt inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                      <Banknote className="h-3.5 w-3.5" />
                      <span>Cần thu</span>
                    </span>
                  </div>
                  <p className="font-mono-tabular mt-2 text-[22px] font-bold text-[var(--status-debt)]">
                    <AnimatedVnd value={1125000} />
                  </p>
                </div>
                <div className="glass-card min-w-0 rounded-[22px] p-4">
                  <p className="text-[12px] font-semibold text-[var(--text-secondary)]">Khách đang nợ</p>
                  <p className="font-mono-tabular mt-2 text-[22px] font-bold text-[var(--text-primary)]">2</p>
                </div>
                <div className="glass-card min-w-0 rounded-[22px] p-4">
                  <p className="text-[12px] font-semibold text-[var(--text-secondary)]">Đến/quá hạn</p>
                  <p className="font-mono-tabular mt-2 text-[22px] font-bold text-[var(--status-overdue)]">2</p>
                </div>
              </div>

              <div className="glass-surface mb-4 flex flex-wrap gap-2 rounded-[24px] p-3">
                {(
                  [
                    ['debtors', 'Đang nợ'],
                    ['due', 'Đến hạn'],
                    ['all', 'Tất cả'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={debtFilter === key}
                    onClick={() => setDebtFilter(key)}
                    className={`press-tactile min-h-[44px] rounded-full px-4 text-[13px] ${
                      debtFilter === key ? 'glass-chip-active font-bold' : 'glass-chip font-semibold'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-2.5">
                {filteredCustomers.map((cust) => (
                  <article
                    key={cust.id}
                    data-gsap-reveal={`debt-${cust.id}`}
                    className="glass-card glass-card-interactive rounded-[22px] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-[16px] font-bold text-[var(--text-primary)]">{cust.name}</h2>
                          {cust.id === 'c1' && (
                            <span className="glass-badge-overdue inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span>Quá hạn · 26/11</span>
                            </span>
                          )}
                          {cust.id === 'c2' && (
                            <span className="glass-badge-debt inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                              <Clock className="h-3.5 w-3.5" />
                              <span>Đến hạn hôm nay</span>
                            </span>
                          )}
                          {cust.total_debt === 0 && (
                            <span className="glass-badge-paid inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                              Đã hết nợ
                            </span>
                          )}
                        </div>
                        <p className="font-mono-tabular mt-1.5 inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)]">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{cust.phone}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2.5 sm:justify-end">
                        <p
                          className={`font-mono-tabular text-[18px] font-bold ${
                            cust.total_debt > 0 ? 'text-[var(--status-debt)]' : 'text-[var(--brand-jade-text)]'
                          }`}
                        >
                          {formatVND(cust.total_debt)}
                        </p>
                        {cust.total_debt > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setCollectAmount(cust.total_debt);
                              setCollectModalCustomer(cust);
                            }}
                            className="glass-btn-primary press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold"
                          >
                            <Banknote className="h-4 w-4" />
                            <span>Thu nợ</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-6 lg:py-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="glass-icon-orb flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px]">
                    <ReceiptText className="h-5 w-5 text-[var(--brand-jade-text)]" />
                  </div>
                  <div>
                    <h1 className="text-[22px] font-bold text-[var(--text-primary)] lg:text-[24px]">
                      Sổ bán hàng
                    </h1>
                    <p className="text-[12px] text-[var(--text-secondary)]">3 đơn mẫu minh họa</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderModalOpen(true)}
                  className="glass-btn-primary press-tactile inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[13px] font-semibold"
                >
                  <Plus className="h-4 w-4" />
                  <span>Xem hóa đơn giấy</span>
                </button>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="glass-card rounded-[20px] p-3.5">
                  <p className="text-[12px] font-medium text-[var(--text-secondary)]">Doanh thu</p>
                  <p className="font-mono-tabular mt-1 text-[17px] font-bold text-[var(--text-primary)]">
                    <AnimatedVnd value={1890000} />
                  </p>
                </div>
                <div className="glass-card rounded-[20px] p-3.5">
                  <p className="text-[12px] font-medium text-[var(--text-secondary)]">Thực thu</p>
                  <p className="font-mono-tabular mt-1 text-[17px] font-bold text-[var(--brand-jade-text)]">
                    <AnimatedVnd value={765000} />
                  </p>
                </div>
                <div className="glass-card rounded-[20px] p-3.5">
                  <p className="text-[12px] font-medium text-[var(--text-secondary)]">Còn nợ</p>
                  <p className="font-mono-tabular mt-1 text-[17px] font-bold text-[var(--status-debt)]">
                    <AnimatedVnd value={1125000} />
                  </p>
                </div>
                <div className="glass-card rounded-[20px] p-3.5">
                  <p className="text-[12px] font-medium text-[var(--text-secondary)]">Lãi gộp</p>
                  <p className="font-mono-tabular mt-1 text-[17px] font-bold text-[var(--brand-jade-text)]">
                    <AnimatedVnd value={507000} />
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {DEMO_ORDERS.map((ord) => (
                  <article
                    key={ord.code}
                    onClick={() => setOrderModalOpen(true)}
                    className="glass-card glass-card-interactive cursor-pointer rounded-[22px] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono-tabular text-[13px] font-bold text-[var(--brand-jade-text)]">
                            {ord.code}
                          </span>
                          <OrderStatusBadge status={ord.status} />
                          <span className="glass-badge-neutral rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                            TK: {ord.account}
                          </span>
                        </div>
                        <p className="mt-1 text-[15px] font-bold text-[var(--text-primary)]">{ord.customer}</p>
                        <p className="truncate text-[13px] text-[var(--text-secondary)]">{ord.itemsSummary}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono-tabular text-[17px] font-bold text-[var(--text-primary)]">
                          {formatVND(ord.total)}
                        </p>
                        <p className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
                          Lãi {formatVND(ord.profit)} · {ord.dateLabel}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="mx-auto max-w-[1220px] px-3 py-4 sm:px-6 lg:py-5">
              <div className="mb-4 flex flex-col gap-3">
                <h1 className="text-[22px] font-bold tracking-[-0.015em] text-[var(--text-primary)] lg:text-[24px]">
                  Thống kê
                </h1>
                <div className="glass-surface flex flex-wrap gap-2 rounded-[24px] p-3">
                  {(
                    [
                      ['today', 'Hôm nay'],
                      ['7d', '7 ngày'],
                      ['30d', '30 ngày'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={statsPreset === key}
                      onClick={() => setStatsPreset(key)}
                      className={`press-tactile min-h-[44px] rounded-full px-4 text-[13px] ${
                        statsPreset === key ? 'glass-chip-active font-bold' : 'glass-chip font-semibold'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <section className="glass-panel rounded-[26px] p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[var(--text-secondary)]">Lãi ước tính</p>
                      <AnimatedSwap swapKey={activeStats.margin} direction="up">
                        <span className="glass-badge-paid font-mono-tabular rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                          Biên lãi {activeStats.margin}%
                        </span>
                      </AnimatedSwap>
                    </div>
                    <p className="font-mono-tabular mt-2 text-[28px] font-bold text-[var(--brand-jade-text)]">
                      <AnimatedVnd value={activeStats.profit} highlightOnChange />
                    </p>
                    <div className="glass-divider mt-3.5 flex items-center justify-between border-t pt-3 text-[13px] text-[var(--text-secondary)]">
                      <span>Giá vốn trong kỳ</span>
                      <strong className="font-mono-tabular text-[var(--text-primary)]">
                        <AnimatedVnd value={activeStats.cost} />
                      </strong>
                    </div>
                  </section>

                  <section className="glass-panel rounded-[26px] p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[var(--text-secondary)]">Giá bán (Doanh thu)</p>
                      <AnimatedSwap swapKey={activeStats.orders} direction="up">
                        <span className="glass-badge-neutral font-mono-tabular rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                          {activeStats.orders} đơn
                        </span>
                      </AnimatedSwap>
                    </div>
                    <p className="font-mono-tabular mt-2 text-[28px] font-bold text-[var(--text-primary)]">
                      <AnimatedVnd value={activeStats.revenue} highlightOnChange />
                    </p>
                    <div className="glass-divider mt-3.5 flex items-center justify-between border-t pt-3 text-[13px] text-[var(--text-secondary)]">
                      <span>Trung bình mỗi đơn</span>
                      <strong className="font-mono-tabular text-[var(--text-primary)]">
                        <AnimatedVnd value={activeStats.avg} />
                      </strong>
                    </div>
                  </section>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="glass-card rounded-[22px] p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[var(--text-secondary)]">Thực thu</p>
                      <p className="font-mono-tabular text-[19px] font-bold text-[var(--text-primary)]">
                        <AnimatedVnd value={activeStats.collected} />
                      </p>
                    </div>
                    <div className="mt-3 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                      <div
                        style={{ width: `${activeStats.cashPct}%` }}
                        className="h-full rounded-full bg-[var(--brand-jade)] transition-[width] duration-300"
                      />
                      <div
                        style={{ width: `${activeStats.transferPct}%` }}
                        className="h-full rounded-full bg-[var(--chart-transfer)] transition-[width] duration-300"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
                      <span>
                        Tiền mặt <strong className="text-[var(--text-primary)]">{activeStats.cashPct}%</strong>
                      </span>
                      <span>
                        Chuyển khoản{' '}
                        <strong className="text-[var(--text-primary)]">{activeStats.transferPct}%</strong>
                      </span>
                    </div>
                  </div>

                  <div className="glass-card rounded-[22px] p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[var(--text-secondary)]">Tổng nợ hiện tại</p>
                      <p className="font-mono-tabular text-[19px] font-bold text-[var(--status-debt)]">
                        <AnimatedVnd value={activeStats.debt} />
                      </p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
                      <span>
                        Nợ mới:{' '}
                        <strong className="font-mono-tabular text-[var(--text-primary)]">
                          <AnimatedVnd value={activeStats.newDebt} />
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('debts')}
                        className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-[var(--brand-jade-text)] hover:underline"
                      >
                        <span>Thu nợ</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="mx-auto max-w-[780px] space-y-4 px-3 py-4 sm:px-6 lg:py-5">
              <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--text-primary)] lg:text-[24px]">
                Cài đặt &amp; Kiểm tra Animation
              </h1>

              <SettingsThemeSelector />

              <section className="glass-panel space-y-3.5 rounded-[24px] p-4 sm:p-5">
                <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
                  Ô nhập liệu &amp; Đổi trạng thái nút (Icon + Chữ)
                </h2>
                <div>
                  <label
                    htmlFor="preview-shop-name"
                    className="mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]"
                  >
                    Tên cửa hàng
                  </label>
                  <input
                    id="preview-shop-name"
                    type="text"
                    value={shopNameDraft}
                    onChange={(e) => setShopNameDraft(e.target.value)}
                    className="glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCycleActionBtn}
                  className="glass-btn-primary press-tactile flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-5 text-[15px] font-bold"
                >
                  <AnimatedSwap
                    swapKey={actionBtnState}
                    direction={actionBtnState === 'saved' ? 'up' : 'down'}
                  >
                    {actionBtnState === 'idle' && (
                      <>
                        <Save className="h-4 w-4 shrink-0" />
                        <span>Lưu thay đổi (bấm để thử)</span>
                      </>
                    )}
                    {actionBtnState === 'saving' && (
                      <>
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        <span>Đang lưu cài đặt...</span>
                      </>
                    )}
                    {actionBtnState === 'saved' && (
                      <>
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>Đã lưu thành công!</span>
                      </>
                    )}
                  </AnimatedSwap>
                </button>
              </section>

              {/* Audit 09 Interactive UI States Showcase */}
              <section
                data-gsap-scroll="settings-ui-states"
                className="glass-panel space-y-3.5 rounded-[24px] p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
                    Trạng thái UI (Loading / Empty / Error / Success)
                  </h2>
                  <button
                    type="button"
                    onClick={() => setCheckoutModalOpen(true)}
                    className="glass-solid-control press-tactile min-h-[44px] rounded-full px-4 text-[13px] font-semibold text-[var(--text-primary)]"
                  >
                    Mở Modal GSAP
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['success', 'Success'],
                      ['loading', 'Loading'],
                      ['empty', 'Empty'],
                      ['error', 'Error'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={auditState === key}
                      onClick={() => setAuditState(key)}
                      className={`press-tactile min-h-[44px] rounded-full px-4 text-[13px] ${
                        auditState === key ? 'glass-chip-active font-bold' : 'glass-chip font-semibold'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {auditState === 'success' && (
                  <div
                    role="status"
                    data-gsap-reveal="preview-success"
                    className="glass-badge-paid flex items-center gap-2.5 rounded-[18px] p-4 text-[14px] font-semibold"
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span>Hoàn tất — Mọi loại animation GSAP (Timeline, ScrollTrigger, Flip, Swap, Counter) đang chạy ở 60fps.</span>
                  </div>
                )}
                {auditState === 'loading' && <PosWorkspaceSkeleton />}
                {auditState === 'empty' && (
                  <EmptyStateCard
                    icon={ShoppingBag}
                    title="Chưa có dữ liệu trong mục này"
                    description="Trạng thái trống chuẩn Audit 09 với nút hành động chính rõ ràng."
                    action={
                      <button
                        type="button"
                        onClick={() => setAuditState('success')}
                        className="glass-btn-primary press-tactile inline-flex min-h-[48px] items-center rounded-full px-5 text-[14px] font-semibold"
                      >
                        Quay lại Success
                      </button>
                    }
                  />
                )}
                {auditState === 'error' && (
                  <FetchErrorCard
                    title="Không tải được kết nối mẫu"
                    message="Kiểm tra hiệu ứng lắc cảnh báo đàn hồi & nút Thử lại."
                    onRetry={() => setAuditState('success')}
                  />
                )}
              </section>
            </div>
          )}
        </div>
      </main>

      {/* Floating Glass Dock with GSAP sliding pill */}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-2 pb-[calc(10px+env(safe-area-inset-bottom))] lg:pb-4">
        <nav
          ref={dockRef}
          aria-label="Điều hướng xem trước"
          className="glass-dock pointer-events-auto relative flex w-full max-w-[440px] items-center gap-0.5 rounded-[30px] p-1 lg:w-auto lg:max-w-none lg:gap-1.5 lg:rounded-full lg:px-2 lg:py-1.5"
        >
          <span
            ref={dockPillRef}
            aria-hidden="true"
            className="glass-dock-pill pointer-events-none absolute top-0 left-0 z-0 rounded-[24px] opacity-0 lg:rounded-full"
          />
          {PREVIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => setActiveTab(tab.id)}
                className={`press-tactile relative z-[1] flex min-h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[24px] px-0 text-[12px] leading-none lg:min-h-[46px] lg:flex-initial lg:flex-row lg:gap-2 lg:rounded-full lg:px-4 lg:text-[14px] ${
                  active
                    ? 'glass-chip-active font-semibold'
                    : 'font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="h-[19px] w-[19px] shrink-0 lg:h-[18px] lg:w-[18px]" />
                <span className="max-w-full truncate whitespace-nowrap leading-none">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Cart Sheet Modal */}
      <ModalDialog
        open={mobileCartOpen}
        onClose={() => setMobileCartOpen(false)}
        ariaLabelledBy="mobile-cart-sheet-title"
        backdropClassName="animate-backdrop-in glass-backdrop fixed inset-0 z-40 flex items-end lg:hidden"
        panelClassName="animate-sheet-up glass-modal flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[26px] pb-[calc(10px+env(safe-area-inset-bottom))]"
      >
        <CartPanel
          variant="sheet"
          onCloseSheet={() => setMobileCartOpen(false)}
          items={cart}
          discount={discount}
          discountInputId="preview-cart-discount-mobile"
          onChangeDiscount={setDiscount}
          onUpdateQty={updateCartQty}
          onRemoveItem={(key) => setCart((prev) => prev.filter((i) => i.key !== key))}
          onClearCart={() => setCart([])}
          selectedCustomer={selectedCustomer}
          onOpenCheckout={() => {
            setMobileCartOpen(false);
            setCheckoutModalOpen(true);
          }}
        />
      </ModalDialog>

      {/* Checkout Preview Modal */}
      <ModalDialog
        open={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        ariaLabelledBy="preview-checkout-modal-title"
        panelClassName="glass-modal flex max-h-[90dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px]"
      >
        <ModalHeader
          title="Chốt đơn xem trước"
          titleId="preview-checkout-modal-title"
          icon={<ShoppingBag className="h-5 w-5" />}
          onClose={() => setCheckoutModalOpen(false)}
        />
        <div className="space-y-4 overflow-y-auto p-5">
          <div className="glass-well flex items-center justify-between rounded-[18px] p-3.5">
            <span className="text-[14px] font-medium text-[var(--text-secondary)]">Tổng thanh toán</span>
            <span className="font-mono-tabular text-[22px] font-bold text-[var(--brand-jade-text)]">
              <AnimatedVnd value={cartTotal} />
            </span>
          </div>

          <PaymentAccountSelector
            value={checkoutAccount}
            note={checkoutAccountNote}
            onChangeAccount={setCheckoutAccount}
            onChangeNote={setCheckoutAccountNote}
          />
        </div>
        <div className="glass-modal-footer flex items-center gap-2.5 px-5 py-4">
          <button
            type="button"
            onClick={() => setCheckoutModalOpen(false)}
            className="glass-btn-secondary press-tactile min-h-[48px] flex-1 rounded-full text-[14px] font-semibold"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => {
              setCheckoutModalOpen(false);
              setSavedToast(
                `Đã chốt đơn mẫu ${formatVND(cartTotal)} (TK: ${checkoutAccount ?? 'Chưa chọn'}).`
              );
            }}
            className="glass-btn-primary press-tactile min-h-[48px] flex-1 rounded-full text-[14px] font-bold"
          >
            Xác nhận đơn
          </button>
        </div>
      </ModalDialog>

      {/* Collect Debt Preview Modal */}
      <ModalDialog
        open={Boolean(collectModalCustomer)}
        onClose={() => setCollectModalCustomer(null)}
        ariaLabelledBy="preview-collect-modal-title"
        panelClassName="glass-modal flex max-h-[90dvh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px]"
      >
        <ModalHeader
          title={`Thu nợ · ${collectModalCustomer?.name ?? ''}`}
          titleId="preview-collect-modal-title"
          icon={<Banknote className="h-5 w-5" />}
          onClose={() => setCollectModalCustomer(null)}
        />
        <div className="space-y-4 p-5">
          <div>
            <label
              htmlFor="preview-collect-amount"
              className="mb-1.5 block text-[13px] font-semibold text-[var(--text-secondary)]"
            >
              Số tiền thu (nghìn đồng)
            </label>
            <VndKInput
              id="preview-collect-amount"
              valueVnd={collectAmount}
              onChangeVnd={setCollectAmount}
              showPreview
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const name = collectModalCustomer?.name;
              setCollectModalCustomer(null);
              setSavedToast(`Đã thu ${formatVND(collectAmount ?? 0)} của ${name}.`);
            }}
            className="glass-btn-primary press-tactile min-h-[48px] w-full rounded-full text-[15px] font-bold"
          >
            Ghi nhận thu nợ
          </button>
        </div>
      </ModalDialog>

      {/* Receipt Light-Paper Lock Modal */}
      <ModalDialog
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        ariaLabelledBy="preview-receipt-modal-title"
        panelClassName="glass-modal flex max-h-[90dvh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px]"
      >
        <ModalHeader
          title="Hóa đơn (Khóa giấy trắng .print-surface-light)"
          titleId="preview-receipt-modal-title"
          icon={<ReceiptText className="h-5 w-5" />}
          onClose={() => setOrderModalOpen(false)}
        />
        <div className="p-5">
          <div className="print-surface-light rounded-[18px] border border-[var(--border-default)] p-4">
            <p className="text-[16px] font-bold">{shopNameDraft}</p>
            <p className="text-[12px] text-[var(--text-secondary)]">Đơn #DH-20261128-0104 · Cô Thu Hà</p>
            <div className="mt-3 space-y-1.5 border-y border-[var(--border-default)] py-2.5 text-[13px]">
              <div className="flex justify-between">
                <span>2x Mật ong hoa nhãn</span>
                <strong className="font-mono-tabular">560.000đ</strong>
              </div>
              <div className="flex justify-between">
                <span>1x Trà ô long Bảo Lộc</span>
                <strong className="font-mono-tabular">95.000đ</strong>
              </div>
            </div>
            <div className="mt-2.5 flex justify-between text-[15px] font-bold">
              <span>Tổng cộng</span>
              <span className="font-mono-tabular text-[var(--brand-jade)]">655.000đ</span>
            </div>
          </div>
        </div>
      </ModalDialog>
    </div>
  );
}
