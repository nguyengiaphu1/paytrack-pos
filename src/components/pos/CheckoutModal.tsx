'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Phone,
  Plus,
  QrCode,
  ReceiptText,
  Search,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  loadCheckoutPrefs,
  loadRecentCustomerIds,
  recordRecentCustomerId,
  resolveRecentCustomers,
  saveCheckoutPrefs,
} from '@/lib/checkout-prefs';
import { formatErrorMessageVN } from '@/lib/errors';
import {
  computeLineTotal,
  computeOrderTotals,
  formatDateVN,
  formatVND,
  getTodayVN,
  stripVietnamese,
} from '@/lib/vietnamese';
import { computeItemsCostTotal, dateInputToVnIso } from '@/lib/ledger';
import type {
  CartItem,
  Customer,
  Order,
  OrderItem,
  PaymentAccount,
  PaymentMethod,
  ShopProfile,
} from '@/types/database';
import { VietQRModal } from '@/components/qr/VietQRModal';
import { InvoicePreviewModal } from '@/components/invoice/InvoicePreviewModal';
import { VndKInput } from '@/components/ui/VndKInput';
import { PaymentAccountSelector } from '@/components/ui/PaymentAccountSelector';
import { ModalDialog } from '@/components/ui/ModalDialog';

interface CheckoutModalProps {
  open: boolean;
  sessionId: number;
  onClose: () => void;
  items: CartItem[];
  discount: number;
  customers: Customer[];
  selectedCustomer: Customer | null;
  profile: ShopProfile | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onCustomerCreated: (customer: Customer) => void;
  onOrderCreated: () => void;
  onCustomerUpdated?: (customer: Customer) => void;
}

type PayChoice = 'full_transfer' | 'full_cash' | 'partial' | 'unpaid';

export function CheckoutModal(props: CheckoutModalProps) {
  if (!props.open) return null;
  // Key strictly by sessionId (incremented only when opening Checkout) so
  // clearing the cart after save never unmounts the confirmation screen.
  return <CheckoutModalBody key={props.sessionId} {...props} />;
}

function CheckoutModalBody({
  onClose,
  items,
  discount,
  customers,
  selectedCustomer,
  profile,
  onSelectCustomer,
  onCustomerCreated,
  onOrderCreated,
  onCustomerUpdated,
}: CheckoutModalProps) {
  // Freeze order items & discount for this checkout session so clearing the draft
  // cart on save cannot mutate or zero-out the active checkout state.
  const [orderItems] = useState<CartItem[]>(() => items);
  const [orderDiscount] = useState<number>(() => discount);
  const { subtotal, discount: safeDiscount, total } = computeOrderTotals(orderItems, orderDiscount);
  const totalCost = computeItemsCostTotal(orderItems);
  const missingAnyCost = orderItems.some((i) => i.cost_price === null);
  const todayVN = getTodayVN();
  const [showItemsBreakdown, setShowItemsBreakdown] = useState(false);

  const buyerCardRef = useRef<HTMLDivElement>(null);
  const searchCustInputRef = useRef<HTMLInputElement>(null);
  const createCustNameRef = useRef<HTMLInputElement>(null);

  const [initialPrefs] = useState(() => loadCheckoutPrefs());
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(selectedCustomer);
  const [pickerMode, setPickerMode] = useState<'closed' | 'search' | 'create'>('closed');
  const [customerQuery, setCustomerQuery] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerPickerError, setCustomerPickerError] = useState<string | null>(null);

  const [choice, setChoice] = useState<PayChoice>(initialPrefs.lastChoice);
  const [showChangeCalc, setShowChangeCalc] = useState(false);
  const [cashTenderedVnd, setCashTenderedVnd] = useState<number | null>(null);
  const [paidVnd, setPaidVnd] = useState<number | null>(total);
  const [paymentAccount, setPaymentAccount] = useState<PaymentAccount | null>(
    initialPrefs.lastAccount
  );
  const [paymentAccountNote, setPaymentAccountNote] = useState('');
  const [purchasedDate, setPurchasedDate] = useState<string>(todayVN);
  const [paidDate, setPaidDate] = useState<string>(todayVN);
  const [dueDate, setDueDate] = useState<string>(todayVN);
  const [buyerName, setBuyerName] = useState<string>(selectedCustomer?.name ?? '');
  const [buyerPhone, setBuyerPhone] = useState<string>(selectedCustomer?.phone ?? '');
  const [buyerAddress, setBuyerAddress] = useState<string>(selectedCustomer?.address ?? '');
  const [syncToCustomer, setSyncToCustomer] = useState(false);
  const [note, setNote] = useState('');
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedOrder, setSavedOrder] = useState<Order | null>(null);
  const [savedItems, setSavedItems] = useState<OrderItem[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const [recentCustomerIds, setRecentCustomerIds] = useState<string[]>(() =>
    loadRecentCustomerIds()
  );
  const recentCustomers = useMemo(
    () => resolveRecentCustomers(customers, recentCustomerIds, 4),
    [customers, recentCustomerIds]
  );

  const filteredCustomers = useMemo(() => {
    const q = stripVietnamese(customerQuery);
    if (!q) return customers.slice(0, 20);
    return customers
      .filter((c) => {
        const hay = stripVietnamese(`${c.name} ${c.phone ?? ''} ${c.address ?? ''} ${c.note ?? ''}`);
        return hay.includes(q) || c.search_text.includes(q);
      })
      .slice(0, 20);
  }, [customers, customerQuery]);

  function applySelectedCustomer(customer: Customer | null) {
    if (customer) {
      setRecentCustomerIds(recordRecentCustomerId(customer.id));
    }
    setActiveCustomer(customer);
    onSelectCustomer(customer);
    setBuyerName(customer?.name ?? '');
    setBuyerPhone(customer?.phone ?? '');
    setBuyerAddress(customer?.address ?? '');
    setSyncToCustomer(false);
    setPickerMode('closed');
    setCustomerQuery('');
    setCustomerPickerError(null);
    setError(null);
  }

  function focusBuyerSection(mode: 'search' | 'create') {
    if (mode === 'create') {
      setNewCustName((prev) => prev || buyerName.trim() || customerQuery.trim());
      setNewCustPhone((prev) => prev || buyerPhone.trim());
      setNewCustAddress((prev) => prev || buyerAddress.trim());
      setCustomerPickerError(null);
    }
    setPickerMode(mode);
    requestAnimationFrame(() => {
      buyerCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const target = mode === 'create' ? createCustNameRef.current : searchCustInputRef.current;
      target?.focus();
    });
  }

  async function handleQuickCreateCustomer() {
    if (creatingCustomer) return;
    setCustomerPickerError(null);
    const trimmedName = newCustName.trim();
    if (!trimmedName) {
      setCustomerPickerError('Vui lòng nhập tên khách hàng.');
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setCustomerPickerError('Mất kết nối mạng — bật lại Wi-Fi hoặc 4G rồi thử lại.');
      return;
    }

    setCreatingCustomer(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');

      const phoneVal = newCustPhone.trim() || null;
      const addrVal = newCustAddress.trim() || null;
      const { data, error: insertErr } = await supabase
        .from('customers')
        .insert({
          user_id: user.id,
          name: trimmedName,
          search_text: stripVietnamese(`${trimmedName} ${phoneVal ?? ''} ${addrVal ?? ''}`),
          phone: phoneVal,
          address: addrVal,
        })
        .select('*')
        .single();

      if (insertErr) throw insertErr;
      const created = data as Customer;
      onCustomerCreated(created);
      applySelectedCustomer(created);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
    } catch (err) {
      setCustomerPickerError(formatErrorMessageVN(err, 'Không thể thêm khách hàng mới.'));
    } finally {
      setCreatingCustomer(false);
    }
  }

  const partialExceedsOrFull =
    choice === 'partial' && paidVnd !== null && Math.round(paidVnd) >= total && total > 0;

  const computedPaid =
    choice === 'full_transfer' || choice === 'full_cash'
      ? total
      : choice === 'unpaid'
        ? 0
        : Math.max(0, Math.min(total, Math.round(paidVnd ?? 0)));

  const remaining = Math.max(0, total - computedPaid);
  const tenderedAmount =
    choice === 'full_cash' && showChangeCalc && cashTenderedVnd !== null
      ? Math.max(0, Math.round(cashTenderedVnd))
      : computedPaid;
  const changeDue = choice === 'full_cash' && showChangeCalc ? Math.max(0, tenderedAmount - total) : 0;

  const paymentMethod: PaymentMethod =
    choice === 'full_transfer'
      ? 'transfer'
      : choice === 'full_cash'
        ? 'cash'
        : choice === 'unpaid' || computedPaid === 0
          ? 'debt'
          : 'mixed';

  const buyerContactChanged =
    Boolean(activeCustomer) &&
    ((buyerPhone.trim() || null) !== (activeCustomer?.phone ?? null) ||
      (buyerAddress.trim() || null) !== (activeCustomer?.address ?? null));

  const detailsSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(purchasedDate === todayVN ? 'Ngày: Hôm nay' : `Ngày: ${formatDateVN(purchasedDate)}`);
    if (remaining === 0 && paidDate !== purchasedDate) {
      parts.push(`Trả: ${formatDateVN(paidDate)}`);
    }
    if (buyerPhone.trim() || buyerAddress.trim()) {
      parts.push('Có SĐT/địa chỉ');
    } else {
      parts.push('Chưa có SĐT/địa chỉ');
    }
    if (note.trim()) {
      parts.push('Có ghi chú');
    }
    return parts.join(' · ');
  }, [purchasedDate, todayVN, remaining, paidDate, buyerPhone, buyerAddress, note]);

  const itemsPreviewText = useMemo(
    () => orderItems.map((i) => `${i.quantity}× ${i.product_name}`).join(', '),
    [orderItems]
  );

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (orderItems.length === 0) {
      setError('Giỏ hàng đang trống, vui lòng thêm ít nhất 1 món.');
      return;
    }

    if (
      choice === 'partial' &&
      (paidVnd === null || !Number.isFinite(paidVnd) || Math.round(paidVnd) <= 0)
    ) {
      setError('Vui lòng nhập số tiền khách trả trước lớn hơn 0đ (hoặc chọn "Ghi nợ hết").');
      return;
    }

    if (partialExceedsOrFull) {
      setError(
        'Số tiền trả trước đã đủ hoặc vượt tổng đơn — hãy chọn "Chuyển khoản đủ" hoặc "Tiền mặt đủ".'
      );
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('Mất kết nối mạng — bật lại Wi-Fi hoặc 4G trước khi lưu đơn.');
      return;
    }

    if (remaining > 0 && !activeCustomer) {
      setError('Đơn ghi nợ bắt buộc chọn khách hàng. Chọn hoặc tạo khách ngay phía trên.');
      focusBuyerSection('search');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const purchasedIso = dateInputToVnIso(purchasedDate) ?? new Date().toISOString();
      const paidIso =
        remaining === 0
          ? dateInputToVnIso(paidDate) ?? purchasedIso
          : computedPaid > 0
            ? purchasedIso
            : null;

      const effectiveAccount = choice === 'unpaid' ? null : paymentAccount;
      const effectiveAccountNote =
        effectiveAccount === 'Khác' ? paymentAccountNote.trim() || null : null;

      const { data: rpcResult, error: rpcErr } = await supabase.rpc('create_order_with_items', {
        p_customer_id: activeCustomer?.id ?? null,
        p_discount_amount: orderDiscount,
        p_paid_amount: computedPaid,
        p_payment_method: paymentMethod,
        p_debt_due_date: remaining > 0 ? dueDate || null : null,
        p_note: note.trim() || null,
        p_items: orderItems.map((i) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          unit: i.unit,
          unit_price: i.unit_price,
          cost_price: i.cost_price,
          quantity: i.quantity,
        })),
        p_customer_name_snapshot: buyerName.trim() || activeCustomer?.name || null,
        p_customer_address_snapshot: buyerAddress.trim(),
        p_customer_phone_snapshot: buyerPhone.trim(),
        p_purchased_at: purchasedIso,
        p_total_cost: totalCost,
        p_payment_account: effectiveAccount,
        p_payment_account_note: effectiveAccountNote,
        p_paid_at: paidIso,
      });

      if (rpcErr) throw rpcErr;
      const rpcObj = (rpcResult ?? {}) as { order_id?: string; order_code?: string };
      const orderId = rpcObj.order_id ?? '';

      // Remember preferred paid method & payment account for next online order
      saveCheckoutPrefs({
        ...(choice === 'full_transfer' || choice === 'full_cash' ? { lastChoice: choice } : {}),
        ...(choice !== 'unpaid' ? { lastAccount: effectiveAccount } : {}),
      });

      // Optionally sync edited phone/address back to customer profile (best-effort)
      if (activeCustomer && syncToCustomer && buyerContactChanged) {
        try {
          const nextPhone = buyerPhone.trim() || null;
          const nextAddr = buyerAddress.trim() || null;
          const { data: updatedCustomer } = await supabase
            .from('customers')
            .update({
              phone: nextPhone,
              address: nextAddr,
              search_text: stripVietnamese(
                `${activeCustomer.name} ${nextPhone ?? ''} ${nextAddr ?? ''}`
              ),
            })
            .eq('id', activeCustomer.id)
            .select('*')
            .single();
          if (updatedCustomer) {
            onCustomerUpdated?.(updatedCustomer as Customer);
          }
        } catch {
          // Order already committed; do not fail confirmation if optional profile sync flakes
        }
      }

      let resolvedOrder: Order | null = null;
      let resolvedItems: OrderItem[] = [];
      if (orderId) {
        try {
          const [{ data: orderRow }, { data: itemRows }] = await Promise.all([
            supabase.from('orders').select('*').eq('id', orderId).single(),
            supabase.from('order_items').select('*').eq('order_id', orderId),
          ]);
          resolvedOrder = (orderRow as Order | null) ?? null;
          resolvedItems = (itemRows as OrderItem[] | null) ?? [];
        } catch {
          // Fall back to synthesized confirmation below so the user never double-submits
        }
      }

      const nowIso = new Date().toISOString();
      const finalOrder: Order = resolvedOrder ?? {
        id: orderId || `local-${nowIso}`,
        user_id: activeCustomer?.user_id ?? profile?.user_id ?? '',
        order_code: rpcObj.order_code || `PT-${(orderId || 'MOI').slice(0, 6).toUpperCase()}`,
        customer_id: activeCustomer?.id ?? null,
        customer_name_snapshot: buyerName.trim() || activeCustomer?.name || 'Khách lẻ',
        customer_address_snapshot: buyerAddress.trim(),
        customer_phone_snapshot: buyerPhone.trim(),
        subtotal,
        discount_amount: orderDiscount,
        total_amount: total,
        total_cost: totalCost,
        paid_amount: computedPaid,
        remaining_amount: remaining,
        previous_customer_debt: activeCustomer?.total_debt ?? 0,
        payment_status: remaining === 0 ? 'paid' : computedPaid > 0 ? 'partial' : 'unpaid',
        payment_method: paymentMethod,
        payment_account: effectiveAccount,
        payment_account_note: effectiveAccountNote,
        debt_due_date: remaining > 0 ? dueDate || null : null,
        purchased_at: purchasedIso,
        paid_at: paidIso,
        note: note.trim() || null,
        created_at: nowIso,
        updated_at: nowIso,
      };

      if (resolvedItems.length === 0) {
        resolvedItems = orderItems.map((i, idx) => ({
          id: `${finalOrder.id}-item-${idx}`,
          user_id: finalOrder.user_id,
          order_id: finalOrder.id,
          product_id: i.product_id,
          product_name: i.product_name,
          unit: i.unit,
          unit_price: i.unit_price,
          cost_price: i.cost_price,
          quantity: i.quantity,
          line_total: Math.round(i.unit_price * i.quantity),
        }));
      }

      setSavedOrder(finalOrder);
      setSavedItems(resolvedItems);
      onOrderCreated();
    } catch (err) {
      setError(formatErrorMessageVN(err, 'Không thể lưu đơn hàng, vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ModalDialog
        open
        onClose={onClose}
        closeOnBackdrop={Boolean(savedOrder)}
        ariaLabelledBy="checkout-modal-title"
        backdropClassName="animate-backdrop-in glass-backdrop fixed inset-0 z-40 flex items-end justify-center p-0 sm:items-center sm:p-4"
        panelClassName="animate-sheet-up sm:animate-modal-in glass-modal flex max-h-[92dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px]"
      >
        <div className="glass-modal-header flex shrink-0 items-center justify-between gap-2 px-5 py-3.5">
          <h2
            id="checkout-modal-title"
            className="min-w-0 flex-1 truncate text-[16px] font-bold text-[var(--text-primary)]"
          >
            {savedOrder ? 'Đã lưu đơn' : 'Chốt đơn'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="glass-solid-control press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

          {savedOrder ? (
            <div className="flex-1 space-y-4 overflow-y-auto p-5 pb-[calc(20px+env(safe-area-inset-bottom))] sm:pb-5">
              <div className="glass-card glass-card-selected rounded-[22px] p-5 text-center">
                <div className="glass-icon-orb mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] text-[var(--brand-jade-text)]">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <p className="mt-3 font-mono-tabular text-[16px] font-bold text-[var(--text-primary)]">
                  {savedOrder.order_code}
                </p>
                <p className="mt-1 break-words text-[14px] text-[var(--text-secondary)]">
                  <strong className="text-[var(--text-primary)]">
                    {savedOrder.customer_name_snapshot}
                  </strong>{' '}
                  ·{' '}
                  <strong className="font-mono-tabular text-[var(--brand-jade-text)]">
                    {formatVND(savedOrder.total_amount)}
                  </strong>
                </p>
                <p
                  className={`mt-2.5 inline-flex flex-wrap items-center justify-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold ${
                    savedOrder.remaining_amount === 0 ? 'glass-badge-paid' : 'glass-badge-debt'
                  }`}
                >
                  <span>
                    {savedOrder.remaining_amount === 0
                      ? savedOrder.payment_method === 'cash'
                        ? 'Đã thu đủ · Tiền mặt'
                        : 'Đã thu đủ · Chuyển khoản'
                      : savedOrder.paid_amount > 0
                        ? `Trả trước ${formatVND(savedOrder.paid_amount)}`
                        : 'Ghi nợ toàn bộ'}
                  </span>
                  {savedOrder.payment_account && (
                    <span>
                      ·{' '}
                      {savedOrder.payment_account === 'Khác' && savedOrder.payment_account_note
                        ? savedOrder.payment_account_note
                        : savedOrder.payment_account}
                    </span>
                  )}
                </p>
                {savedOrder.remaining_amount > 0 && (
                  <p className="mt-2 font-mono-tabular text-[14px] font-bold text-[var(--status-debt)]">
                    Còn nợ: {formatVND(savedOrder.remaining_amount)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setInvoiceOpen(true)}
                  className={`press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold sm:text-[14px] ${
                    savedOrder.remaining_amount === 0
                      ? 'glass-btn-primary'
                      : 'glass-solid-control text-[var(--text-primary)]'
                  }`}
                >
                  <ReceiptText
                    className={`h-4 w-4 shrink-0 ${
                      savedOrder.remaining_amount === 0 ? 'text-white' : 'text-[var(--brand-jade-text)]'
                    }`}
                  />
                  <span className="truncate">Hóa đơn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  className={`press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold sm:text-[14px] ${
                    savedOrder.remaining_amount > 0
                      ? 'glass-btn-primary'
                      : 'glass-solid-control text-[var(--text-primary)]'
                  }`}
                >
                  <QrCode
                    className={`h-4 w-4 shrink-0 ${
                      savedOrder.remaining_amount > 0 ? 'text-white' : 'text-[var(--brand-jade-text)]'
                    }`}
                  />
                  <span className="truncate">Tạo QR</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="glass-solid-control press-tactile flex min-h-[48px] w-full items-center justify-center rounded-full text-[15px] font-semibold text-[var(--text-primary)]"
              >
                Bán đơn mới
              </button>
            </div>
          ) : (
            <form onSubmit={handleConfirm} noValidate className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-3.5 overflow-y-auto p-4 sm:p-5">
                {error && (
                  <div
                    ref={(el) => {
                      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }}
                    role="alert"
                    className="glass-badge-overdue rounded-[16px] px-3.5 py-2.5 text-[14px] font-medium"
                  >
                    {error}
                  </div>
                )}

                {/* Buyer Identity Verification Card + Inline Switcher */}
                <div ref={buyerCardRef} className="glass-card rounded-[22px] p-3.5">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      <div className="glass-icon-orb mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-[var(--brand-jade-text)]">
                        <UserCheck className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="break-words text-[15px] font-bold text-[var(--text-primary)]">
                            {activeCustomer ? activeCustomer.name : buyerName.trim() || 'Khách lẻ'}
                          </span>
                          {!activeCustomer && buyerName.trim() && (
                            <span className="glass-badge-neutral shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-medium">
                              Khách lẻ · chưa lưu danh bạ
                            </span>
                          )}
                          {activeCustomer && activeCustomer.total_debt > 0 && (
                            <span className="glass-badge-debt font-mono-tabular shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold">
                              Nợ cũ: {formatVND(activeCustomer.total_debt)}
                            </span>
                          )}
                        </div>
                        {(activeCustomer?.phone || activeCustomer?.address) && (
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] text-[var(--text-secondary)]">
                            {activeCustomer.phone && (
                              <span className="font-mono-tabular inline-flex items-center gap-1">
                                <Phone className="h-3 w-3 shrink-0" />
                                {activeCustomer.phone}
                              </span>
                            )}
                            {activeCustomer.address && (
                              <span className="inline-flex min-w-0 items-center gap-1 break-words">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {activeCustomer.address}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        pickerMode === 'closed'
                          ? focusBuyerSection('search')
                          : setPickerMode('closed')
                      }
                      className="glass-solid-control press-tactile min-h-[44px] shrink-0 rounded-full px-3.5 text-[13px] font-semibold text-[var(--brand-jade-text)]"
                    >
                      {pickerMode !== 'closed'
                        ? 'Đóng'
                        : activeCustomer
                          ? 'Đổi khách'
                          : 'Chọn khách'}
                    </button>
                  </div>

                  {pickerMode === 'search' && (
                    <div className="glass-divider mt-3 space-y-2.5 border-t pt-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                          <input
                            ref={searchCustInputRef}
                            type="search"
                            value={customerQuery}
                            onChange={(e) => setCustomerQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (customerQuery.trim() && filteredCustomers.length === 1) {
                                  applySelectedCustomer(filteredCustomers[0]);
                                }
                              }
                            }}
                            placeholder="Tìm tên, SĐT, địa chỉ..."
                            aria-label="Tìm khách hàng trong thanh toán"
                            className="glass-input min-h-[44px] w-full rounded-[14px] pr-11 pl-10 text-[16px] text-[var(--text-primary)] outline-none [&::-webkit-search-cancel-button]:hidden"
                          />
                          {customerQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomerQuery('');
                                searchCustInputRef.current?.focus();
                              }}
                              aria-label="Xóa từ khóa tìm khách hàng"
                              className="press-tactile absolute top-1/2 right-0.5 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => focusBuyerSection('create')}
                          className="glass-btn-primary press-tactile flex min-h-[44px] shrink-0 items-center gap-1 rounded-[14px] px-3.5 text-[13px] font-semibold"
                        >
                          <UserPlus className="h-4 w-4 shrink-0" />
                          <span>Tạo mới</span>
                        </button>
                      </div>

                      {!customerQuery.trim() && recentCustomers.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
                            Gần đây
                          </p>
                          <div
                            role="group"
                            aria-label="Khách hàng chọn gần đây"
                            className="flex flex-wrap gap-1.5"
                          >
                            {recentCustomers.map((c) => {
                              const isSelected = activeCustomer?.id === c.id;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  aria-pressed={isSelected}
                                  onClick={() => applySelectedCustomer(c)}
                                  className={`press-tactile inline-flex min-h-[44px] max-w-full items-center gap-1.5 rounded-full px-3 text-[13px] ${
                                    isSelected
                                      ? 'glass-chip-active font-semibold'
                                      : 'glass-chip font-medium text-[var(--text-primary)]'
                                  }`}
                                >
                                  {isSelected && (
                                    <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                                  )}
                                  <span className="truncate">{c.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="glass-well max-h-48 space-y-1.5 overflow-y-auto rounded-[16px] p-1.5">
                        {activeCustomer && (
                          <button
                            type="button"
                            onClick={() => applySelectedCustomer(null)}
                            className="glass-btn-secondary press-tactile flex min-h-[44px] w-full items-center justify-between rounded-[12px] px-3 py-2 text-left text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            <span>Chuyển về Khách lẻ (không lưu công nợ)</span>
                          </button>
                        )}
                        {filteredCustomers.length === 0 ? (
                          <p className="py-3 text-center text-[13px] text-[var(--text-secondary)]">
                            Không tìm thấy khách phù hợp — bấm &ldquo;Tạo mới&rdquo; để lưu nhanh.
                          </p>
                        ) : (
                          filteredCustomers.map((c) => {
                            const isSelected = activeCustomer?.id === c.id;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                aria-current={isSelected ? 'true' : undefined}
                                onClick={() => applySelectedCustomer(c)}
                                className={`flex min-h-[46px] w-full items-center justify-between gap-2 rounded-[12px] px-3 py-2 text-left ${
                                  isSelected
                                    ? 'glass-chip-active'
                                    : 'glass-card glass-card-interactive'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="flex items-center gap-1.5 truncate text-[14px] font-semibold text-[var(--text-primary)]">
                                    {isSelected && (
                                      <Check className="h-3.5 w-3.5 shrink-0 text-[var(--brand-jade-text)]" />
                                    )}
                                    <span className="truncate">{c.name}</span>
                                  </p>
                                  {(c.phone || c.address) && (
                                    <p className="truncate text-[12px] text-[var(--text-secondary)]">
                                      {[c.phone, c.address].filter(Boolean).join(' · ')}
                                    </p>
                                  )}
                                </div>
                                {c.total_debt > 0 && (
                                  <span className="glass-badge-debt font-mono-tabular shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold">
                                    Nợ {formatVND(c.total_debt)}
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                      {!customerQuery.trim() && customers.length > 20 && (
                        <p className="text-[12px] text-[var(--text-secondary)]">
                          Hiển thị 20 / {customers.length} khách — gõ tên hoặc SĐT để lọc thêm.
                        </p>
                      )}
                    </div>
                  )}

                  {pickerMode === 'create' && (
                    <div className="glass-well mt-3 space-y-2.5 rounded-[16px] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                          Thêm nhanh khách hàng
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerPickerError(null);
                            focusBuyerSection('search');
                          }}
                          className="min-h-[44px] rounded-full px-2.5 text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                        >
                          Quay lại tìm
                        </button>
                      </div>
                      {customerPickerError && (
                        <div
                          role="alert"
                          className="glass-badge-overdue rounded-[12px] px-3 py-2 text-[13px] font-medium"
                        >
                          {customerPickerError}
                        </div>
                      )}
                      <div>
                        <label
                          htmlFor="checkout-new-cust-name"
                          className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]"
                        >
                          Tên khách hàng *
                        </label>
                        <input
                          id="checkout-new-cust-name"
                          ref={createCustNameRef}
                          type="text"
                          value={newCustName}
                          onChange={(e) => setNewCustName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleQuickCreateCustomer();
                            }
                          }}
                          placeholder="Cô Lan, Chị Hoa..."
                          className="glass-input min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="checkout-new-cust-phone"
                            className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]"
                          >
                            Số điện thoại
                          </label>
                          <input
                            id="checkout-new-cust-phone"
                            type="tel"
                            value={newCustPhone}
                            onChange={(e) => setNewCustPhone(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void handleQuickCreateCustomer();
                              }
                            }}
                            placeholder="0901234567"
                            className="glass-input font-mono-tabular min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="checkout-new-cust-address"
                            className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]"
                          >
                            Địa chỉ giao hàng
                          </label>
                          <input
                            id="checkout-new-cust-address"
                            type="text"
                            value={newCustAddress}
                            onChange={(e) => setNewCustAddress(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void handleQuickCreateCustomer();
                              }
                            }}
                            placeholder="Số nhà, đường..."
                            className="glass-input min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={creatingCustomer}
                        onClick={() => void handleQuickCreateCustomer()}
                        className="glass-btn-primary press-tactile flex min-h-[46px] w-full items-center justify-center gap-1.5 rounded-full px-4 text-[14px] font-semibold disabled:opacity-60"
                      >
                        {creatingCustomer ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        <span>{creatingCustomer ? 'Đang lưu...' : 'Lưu & chọn khách này'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Order Totals Summary (Recessed Glass Well) */}
                <div className="glass-well space-y-2 rounded-[18px] p-4">
                  {safeDiscount > 0 && (
                    <div className="glass-divider space-y-1 border-b pb-2 text-[13px]">
                      <div className="flex items-baseline justify-between gap-2 text-[var(--text-secondary)]">
                        <span>Tạm tính</span>
                        <span className="font-mono-tabular font-medium text-[var(--text-primary)]">
                          {formatVND(subtotal)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2 text-[var(--status-debt)]">
                        <span>Giảm giá</span>
                        <span className="font-mono-tabular font-semibold">
                          -{formatVND(safeDiscount)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[14px] font-medium text-[var(--text-secondary)]">
                      Tổng đơn ({orderItems.length} món)
                    </span>
                    <span className="font-mono-tabular shrink-0 text-[20px] font-bold text-[var(--text-primary)]">
                      {formatVND(total)}
                    </span>
                  </div>

                  {orderItems.length > 0 && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setShowItemsBreakdown((v) => !v)}
                        aria-expanded={showItemsBreakdown}
                        aria-controls="checkout-items-breakdown"
                        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[12px] px-2 text-left text-[12px] font-semibold text-[var(--brand-jade-text)] transition-colors hover:bg-[var(--bg-subtle)]"
                      >
                        <span className="min-w-0 truncate">
                          {showItemsBreakdown
                            ? `Thu gọn chi tiết ${orderItems.length} món`
                            : `Xem chi tiết ${orderItems.length} món`}
                        </span>
                        {showItemsBreakdown ? (
                          <ChevronUp className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        )}
                      </button>

                      {!showItemsBreakdown && itemsPreviewText && (
                        <p className="line-clamp-2 px-2 text-[12px] text-[var(--text-secondary)]">
                          {itemsPreviewText}
                        </p>
                      )}

                      {showItemsBreakdown && (
                        <ul
                          id="checkout-items-breakdown"
                          className="glass-divider space-y-1.5 border-t pt-2 text-[13px]"
                        >
                          {orderItems.map((item) => (
                            <li
                              key={item.key}
                              className="flex items-start justify-between gap-3"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-[var(--text-primary)]">
                                  {item.product_name}
                                </p>
                                <p className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
                                  {item.quantity} {item.unit} × {formatVND(item.unit_price)}
                                </p>
                              </div>
                              <span className="font-mono-tabular shrink-0 font-semibold text-[var(--text-primary)]">
                                {formatVND(computeLineTotal(item.unit_price, item.quantity))}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {totalCost > 0 ? (
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
                      <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                        <span>Giá vốn / Lãi</span>
                        {missingAnyCost && (
                          <span className="glass-badge-debt rounded-full px-2 py-0.5 text-[12px] font-semibold">
                            Thiếu vốn vài món
                          </span>
                        )}
                      </span>
                      <span className="font-mono-tabular text-[var(--text-secondary)]">
                        {formatVND(totalCost)} /{' '}
                        <strong
                          className={
                            total - totalCost >= 0
                              ? 'text-[var(--brand-jade-text)]'
                              : 'text-[var(--status-overdue)]'
                          }
                        >
                          {formatVND(total - totalCost)}
                        </strong>
                      </span>
                    </div>
                  ) : (
                    missingAnyCost && (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--status-debt)]">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>Chưa nhập vốn</span>
                        </span>
                        <span className="text-[var(--text-secondary)]">
                          Có thể bổ sung sau ở Sổ bán
                        </span>
                      </div>
                    )
                  )}

                  {changeDue > 0 && (
                    <div className="glass-divider flex flex-wrap items-baseline justify-between gap-2 border-t pt-2 text-[14px] font-bold text-[var(--brand-jade-text)]">
                      <span>Tiền thối</span>
                      <span className="font-mono-tabular text-[16px]">{formatVND(changeDue)}</span>
                    </div>
                  )}
                  {remaining > 0 && (
                    <div className="glass-divider flex flex-wrap items-baseline justify-between gap-2 border-t pt-2 text-[14px] font-bold text-[var(--status-debt)]">
                      <span>Còn nợ</span>
                      <span className="font-mono-tabular text-[16px]">{formatVND(remaining)}</span>
                    </div>
                  )}
                </div>

                {/* Payment Choice (Online-first: Transfer -> Cash -> Partial -> Debt) */}
                <div>
                  <p className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">
                    Trạng thái thanh toán
                  </p>
                  <div
                    role="group"
                    aria-label="Trạng thái thanh toán"
                    className="grid grid-cols-2 gap-2"
                  >
                    <button
                      type="button"
                      aria-pressed={choice === 'full_transfer'}
                      onClick={() => {
                        setChoice('full_transfer');
                        setPaidVnd(total);
                        setShowChangeCalc(false);
                        setCashTenderedVnd(null);
                      }}
                      className={`press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-[16px] px-2.5 text-[13px] sm:px-3 sm:text-[14px] ${
                        choice === 'full_transfer'
                          ? 'glass-chip-active ring-2 ring-[var(--brand-jade)] font-bold'
                          : 'glass-chip font-semibold text-[var(--text-primary)]'
                      }`}
                    >
                      {choice === 'full_transfer' && (
                        <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
                      )}
                      <span>Chuyển khoản đủ</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={choice === 'full_cash'}
                      onClick={() => {
                        setChoice('full_cash');
                        setPaidVnd(total);
                      }}
                      className={`press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-[16px] px-2.5 text-[13px] sm:px-3 sm:text-[14px] ${
                        choice === 'full_cash'
                          ? 'glass-chip-active ring-2 ring-[var(--brand-jade)] font-bold'
                          : 'glass-chip font-semibold text-[var(--text-primary)]'
                      }`}
                    >
                      {choice === 'full_cash' && (
                        <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
                      )}
                      <span>Tiền mặt đủ</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={choice === 'partial'}
                      onClick={() => {
                        setChoice('partial');
                        setPaidVnd(null);
                        setShowChangeCalc(false);
                        setCashTenderedVnd(null);
                      }}
                      className={`press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-[16px] px-2.5 text-[13px] sm:px-3 sm:text-[14px] ${
                        choice === 'partial'
                          ? 'glass-badge-debt ring-2 ring-[var(--status-debt)] font-bold'
                          : 'glass-chip font-semibold text-[var(--text-primary)]'
                      }`}
                    >
                      {choice === 'partial' && (
                        <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
                      )}
                      <span>Trả một phần</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={choice === 'unpaid'}
                      onClick={() => {
                        setChoice('unpaid');
                        setPaidVnd(0);
                        setShowChangeCalc(false);
                        setCashTenderedVnd(null);
                      }}
                      className={`press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-[16px] px-2.5 text-[13px] sm:px-3 sm:text-[14px] ${
                        choice === 'unpaid'
                          ? 'glass-badge-debt ring-2 ring-[var(--status-debt)] font-bold'
                          : 'glass-chip font-semibold text-[var(--text-primary)]'
                      }`}
                    >
                      {choice === 'unpaid' && (
                        <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
                      )}
                      <span>Ghi nợ hết</span>
                    </button>
                  </div>
                </div>

                {remaining > 0 && !activeCustomer && (
                  <div className="glass-badge-debt flex flex-wrap items-center justify-between gap-2 rounded-[18px] px-3.5 py-2.5 text-[13px] font-semibold">
                    <span>Đơn ghi nợ cần chọn khách hàng.</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => focusBuyerSection('search')}
                        className="glass-solid-control press-tactile min-h-[44px] rounded-full px-3 text-[13px] font-bold text-[var(--status-debt)]"
                      >
                        Chọn khách
                      </button>
                      <button
                        type="button"
                        onClick={() => focusBuyerSection('create')}
                        className="glass-btn-primary press-tactile min-h-[44px] rounded-full px-3 text-[13px] font-bold"
                      >
                        Tạo khách mới
                      </button>
                    </div>
                  </div>
                )}

                {/* Optional Cash Change Calculator (only when Tiền mặt is selected) */}
                {choice === 'full_cash' && (
                  <div>
                    {!showChangeCalc ? (
                      <button
                        type="button"
                        onClick={() => setShowChangeCalc(true)}
                        className="glass-solid-control press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-[var(--brand-jade-text)]"
                      >
                        <Calculator className="h-4 w-4 shrink-0" />
                        <span>Tính tiền thối (nếu khách đưa dư)</span>
                      </button>
                    ) : (
                      <div className="glass-well space-y-2 rounded-[16px] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <label
                            htmlFor="checkout-tendered"
                            className="text-[13px] font-medium text-[var(--text-primary)]"
                          >
                            Khách đưa (nghìn)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setShowChangeCalc(false);
                              setCashTenderedVnd(null);
                            }}
                            className="min-h-[44px] rounded-full px-2.5 text-[12px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                          >
                            Ẩn
                          </button>
                        </div>
                        <VndKInput
                          id="checkout-tendered"
                          valueVnd={cashTenderedVnd}
                          onChangeVnd={setCashTenderedVnd}
                          placeholder="Bỏ trống nếu đưa đủ"
                          showPreview
                        />
                      </div>
                    )}
                  </div>
                )}

                {choice === 'partial' && (
                  <div className="space-y-2.5">
                    <div className="glass-well rounded-[16px] p-3">
                      <label
                        htmlFor="checkout-partial"
                        className="mb-1.5 block text-[13px] font-medium text-[var(--text-primary)]"
                      >
                        Khách trả trước (nghìn) *
                      </label>
                      <VndKInput
                        id="checkout-partial"
                        required
                        valueVnd={paidVnd}
                        onChangeVnd={setPaidVnd}
                        placeholder="100"
                        showPreview
                      />
                    </div>
                    {partialExceedsOrFull && (
                      <div
                        role="alert"
                        className="glass-badge-debt space-y-2.5 rounded-[18px] p-3.5 text-[13px] font-medium"
                      >
                        <p>
                          Số tiền trả trước đã bằng hoặc vượt tổng đơn ({formatVND(total)}). Chọn
                          hình thức trả đủ để ghi đúng sổ:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setChoice('full_transfer');
                              setPaidVnd(total);
                              setError(null);
                            }}
                            className="glass-btn-primary press-tactile min-h-[44px] rounded-full px-3.5 text-[13px] font-bold"
                          >
                            Chuyển khoản đủ
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setChoice('full_cash');
                              setPaidVnd(total);
                              setError(null);
                            }}
                            className="glass-solid-control press-tactile min-h-[44px] rounded-full px-3.5 text-[13px] font-bold text-[var(--text-primary)]"
                          >
                            Tiền mặt đủ
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick-Pick Payment Account Selector (3 MRU pills + expandable 9-account drawer) */}
                {choice !== 'unpaid' && (
                  <PaymentAccountSelector
                    value={paymentAccount}
                    note={paymentAccountNote}
                    onChangeAccount={setPaymentAccount}
                    onChangeNote={setPaymentAccountNote}
                  />
                )}

                {/* Debt Due Date (kept directly visible only when recording debt) */}
                {remaining > 0 && (
                  <div className="glass-well rounded-[16px] p-3">
                    <label
                      htmlFor="checkout-due-date"
                      className="mb-1.5 block text-[13px] font-medium text-[var(--text-primary)]"
                    >
                      Ngày hẹn thu nợ
                    </label>
                    <input
                      id="checkout-due-date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="glass-input font-mono-tabular min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                    />
                  </div>
                )}

                {/* Progressive Disclosure for Optional Bookkeeping Fields */}
                <div className="glass-well overflow-hidden rounded-[18px]">
                  <button
                    type="button"
                    onClick={() => setDetailsExpanded((v) => !v)}
                    aria-expanded={detailsExpanded}
                    className="flex min-h-[50px] w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                        Ngày, SĐT/địa chỉ & ghi chú
                      </p>
                      {!detailsExpanded && (
                        <p className="truncate text-[12px] text-[var(--text-secondary)]">
                          {detailsSummary}
                        </p>
                      )}
                    </div>
                    <span className="glass-solid-control inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold text-[var(--brand-jade-text)]">
                      <span>{detailsExpanded ? 'Thu gọn' : 'Chỉnh sửa'}</span>
                      {detailsExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </button>

                  {detailsExpanded && (
                    <div className="glass-divider space-y-3 border-t p-3.5">
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <div className="min-w-0">
                          <label
                            htmlFor="checkout-purchased-date"
                            className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]"
                          >
                            Ngày mua hàng
                          </label>
                          <input
                            id="checkout-purchased-date"
                            type="date"
                            value={purchasedDate}
                            onChange={(e) => {
                              const next = e.target.value;
                              setPurchasedDate(next);
                              if (paidDate === purchasedDate) setPaidDate(next);
                            }}
                            className="glass-input font-mono-tabular min-h-[44px] w-full min-w-0 rounded-[14px] px-3 text-[16px] text-[var(--text-primary)] outline-none"
                          />
                        </div>
                        {remaining === 0 && (
                          <div className="min-w-0">
                            <label
                              htmlFor="checkout-paid-date"
                              className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]"
                            >
                              Ngày thanh toán
                            </label>
                            <input
                              id="checkout-paid-date"
                              type="date"
                              value={paidDate}
                              onChange={(e) => setPaidDate(e.target.value)}
                              className="glass-input font-mono-tabular min-h-[44px] w-full min-w-0 rounded-[14px] px-3 text-[16px] text-[var(--text-primary)] outline-none"
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                          Thông tin người mua trên sổ
                        </p>
                        {!activeCustomer && (
                          <div>
                            <label
                              htmlFor="checkout-buyer-name"
                              className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]"
                            >
                              Tên người mua
                            </label>
                            <input
                              id="checkout-buyer-name"
                              type="text"
                              value={buyerName}
                              onChange={(e) => setBuyerName(e.target.value)}
                              placeholder="Mặc định: Khách lẻ"
                              className="glass-input min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <label
                              htmlFor="checkout-buyer-phone"
                              className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]"
                            >
                              SĐT người mua
                            </label>
                            <input
                              id="checkout-buyer-phone"
                              type="tel"
                              value={buyerPhone}
                              onChange={(e) => setBuyerPhone(e.target.value)}
                              placeholder="0901234567"
                              className="glass-input font-mono-tabular min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="checkout-buyer-address"
                              className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]"
                            >
                              Địa chỉ giao hàng
                            </label>
                            <input
                              id="checkout-buyer-address"
                              type="text"
                              value={buyerAddress}
                              onChange={(e) => setBuyerAddress(e.target.value)}
                              placeholder="Số nhà, đường..."
                              className="glass-input min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                            />
                          </div>
                        </div>
                        {buyerContactChanged && (
                          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-[13px] text-[var(--text-primary)]">
                            <input
                              type="checkbox"
                              checked={syncToCustomer}
                              onChange={(e) => setSyncToCustomer(e.target.checked)}
                              className="h-4 w-4 accent-[var(--brand-jade)]"
                            />
                            <span>Lưu SĐT / Địa chỉ mới vào danh bạ khách</span>
                          </label>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="checkout-note"
                          className="mb-1 block text-[13px] font-medium text-[var(--text-primary)]"
                        >
                          Ghi chú đơn
                        </label>
                        <input
                          id="checkout-note"
                          type="text"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Ghi chú giao hàng hoặc thanh toán..."
                          className="glass-input min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Submit Footer */}
              <div className="glass-modal-footer shrink-0 space-y-2 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:px-5 sm:pb-3.5">
                {remaining > 0 && !activeCustomer && (
                  <div
                    role="alert"
                    className="glass-badge-debt flex items-center justify-between gap-2 rounded-[14px] px-3 py-1.5"
                  >
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] font-semibold">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span className="truncate">Cần chọn khách hàng để ghi nợ</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => focusBuyerSection('search')}
                      className="glass-solid-control press-tactile inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-semibold text-[var(--text-primary)]"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Chọn khách</span>
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    orderItems.length === 0 ||
                    partialExceedsOrFull ||
                    (remaining > 0 && !activeCustomer)
                  }
                  className="glass-btn-primary press-tactile flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-5 text-[16px] font-bold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
                  <span>
                    {submitting
                      ? 'Đang lưu...'
                      : remaining === 0
                        ? `Lưu đơn · Thu ${formatVND(total)}`
                        : computedPaid > 0
                          ? `Lưu đơn · Thu ${formatVND(computedPaid)} · Nợ ${formatVND(remaining)}`
                          : `Lưu đơn · Ghi nợ ${formatVND(remaining)}`}
                  </span>
                </button>
              </div>
            </form>
          )}
      </ModalDialog>

      <VietQRModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        profile={profile}
        customerName={savedOrder?.customer_name_snapshot ?? 'Khách hàng'}
        fixedOrder={savedOrder}
        context="order"
      />

      <InvoicePreviewModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        order={savedOrder}
        items={savedItems}
        profile={profile}
      />
    </>
  );
}
