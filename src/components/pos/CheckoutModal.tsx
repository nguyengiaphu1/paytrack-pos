'use client';

import { useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, Calculator, Check, Loader2, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { loadCheckoutPrefs, saveCheckoutPrefs } from '@/lib/checkout-prefs';
import { buildCustomerSearchText } from '@/lib/customers';
import { formatErrorMessageVN } from '@/lib/errors';
import { computeOrderTotals, formatVND, getTodayVN } from '@/lib/vietnamese';
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
import { ModalHeader } from '@/components/ui/ModalHeader';
import { CheckoutSuccessView } from './checkout/CheckoutSuccessView';
import { CheckoutBuyerSection, type BuyerPickerMode } from './checkout/CheckoutBuyerSection';
import { CheckoutOrderSummary } from './checkout/CheckoutOrderSummary';
import { CheckoutBookkeepingSection } from './checkout/CheckoutBookkeepingSection';

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

  const buyerCardRef = useRef<HTMLDivElement>(null);
  const searchCustInputRef = useRef<HTMLInputElement>(null);
  const createCustNameRef = useRef<HTMLInputElement>(null);

  const [initialPrefs] = useState(() => loadCheckoutPrefs());
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(selectedCustomer);
  const [pickerMode, setPickerMode] = useState<BuyerPickerMode>('closed');

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedOrder, setSavedOrder] = useState<Order | null>(null);
  const [savedItems, setSavedItems] = useState<OrderItem[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  function applySelectedCustomer(customer: Customer | null) {
    setActiveCustomer(customer);
    onSelectCustomer(customer);
    setBuyerName(customer?.name ?? '');
    setBuyerPhone(customer?.phone ?? '');
    setBuyerAddress(customer?.address ?? '');
    setSyncToCustomer(false);
    setPickerMode('closed');
    setError(null);
  }

  function focusBuyerSection(mode: BuyerPickerMode) {
    setPickerMode(mode);
    if (mode === 'closed') return;
    requestAnimationFrame(() => {
      buyerCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const target = mode === 'create' ? createCustNameRef.current : searchCustInputRef.current;
      target?.focus();
    });
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
              search_text: buildCustomerSearchText(activeCustomer.name, nextPhone, nextAddr),
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

  const payChoiceOptions: Array<{
    value: PayChoice;
    label: string;
    tone: 'jade' | 'debt';
    onSelect: () => void;
  }> = [
    {
      value: 'full_transfer',
      label: 'Chuyển khoản đủ',
      tone: 'jade',
      onSelect: () => {
        setChoice('full_transfer');
        setPaidVnd(total);
        setShowChangeCalc(false);
        setCashTenderedVnd(null);
      },
    },
    {
      value: 'full_cash',
      label: 'Tiền mặt đủ',
      tone: 'jade',
      onSelect: () => {
        setChoice('full_cash');
        setPaidVnd(total);
      },
    },
    {
      value: 'partial',
      label: 'Trả một phần',
      tone: 'debt',
      onSelect: () => {
        setChoice('partial');
        setPaidVnd(null);
        setShowChangeCalc(false);
        setCashTenderedVnd(null);
      },
    },
    {
      value: 'unpaid',
      label: 'Ghi nợ hết',
      tone: 'debt',
      onSelect: () => {
        setChoice('unpaid');
        setPaidVnd(0);
        setShowChangeCalc(false);
        setCashTenderedVnd(null);
      },
    },
  ];

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
        <ModalHeader
          title={savedOrder ? 'Đã lưu đơn' : 'Chốt đơn'}
          titleId="checkout-modal-title"
          onClose={onClose}
        />

        {savedOrder ? (
          <CheckoutSuccessView
            order={savedOrder}
            onOpenInvoice={() => setInvoiceOpen(true)}
            onOpenQr={() => setQrOpen(true)}
            onClose={onClose}
          />
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

              <CheckoutBuyerSection
                buyerCardRef={buyerCardRef}
                searchInputRef={searchCustInputRef}
                createNameRef={createCustNameRef}
                customers={customers}
                activeCustomer={activeCustomer}
                buyerName={buyerName}
                buyerPhone={buyerPhone}
                buyerAddress={buyerAddress}
                pickerMode={pickerMode}
                onRequestMode={(mode) => focusBuyerSection(mode)}
                onSelectCustomer={applySelectedCustomer}
                onCustomerCreated={onCustomerCreated}
              />

              <CheckoutOrderSummary
                items={orderItems}
                subtotal={subtotal}
                discount={safeDiscount}
                total={total}
                totalCost={totalCost}
                missingAnyCost={missingAnyCost}
                changeDue={changeDue}
                remaining={remaining}
              />

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
                  {payChoiceOptions.map((opt) => {
                    const isActive = choice === opt.value;
                    const activeClass =
                      opt.tone === 'jade'
                        ? 'glass-chip-active ring-2 ring-[var(--brand-jade)] font-bold'
                        : 'glass-badge-debt ring-2 ring-[var(--status-debt)] font-bold';
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={isActive}
                        onClick={opt.onSelect}
                        className={`press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-[16px] px-2.5 text-[13px] sm:px-3 sm:text-[14px] ${
                          isActive
                            ? activeClass
                            : 'glass-chip font-semibold text-[var(--text-primary)]'
                        }`}
                      >
                        {isActive && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
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
                        Số tiền trả trước đã bằng hoặc vượt tổng đơn ({formatVND(total)}). Chọn hình
                        thức trả đủ để ghi đúng sổ:
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

              <CheckoutBookkeepingSection
                todayVN={todayVN}
                hasActiveCustomer={Boolean(activeCustomer)}
                remaining={remaining}
                purchasedDate={purchasedDate}
                paidDate={paidDate}
                buyerName={buyerName}
                buyerPhone={buyerPhone}
                buyerAddress={buyerAddress}
                buyerContactChanged={buyerContactChanged}
                syncToCustomer={syncToCustomer}
                note={note}
                onChangePurchasedDate={(next) => {
                  setPurchasedDate(next);
                  if (paidDate === purchasedDate) setPaidDate(next);
                }}
                onChangePaidDate={setPaidDate}
                onChangeBuyerName={setBuyerName}
                onChangeBuyerPhone={setBuyerPhone}
                onChangeBuyerAddress={setBuyerAddress}
                onChangeSyncToCustomer={setSyncToCustomer}
                onChangeNote={setNote}
              />
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
