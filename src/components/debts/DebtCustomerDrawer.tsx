'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Banknote,
  BellPlus,
  Check,
  Clock,
  Copy,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  QrCode,
  Trash2,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  buildZaloDebtMessage,
  formatDateTimeVN,
  formatDateVN,
  formatVND,
  getTodayVN,
  stripVietnamese,
} from '@/lib/vietnamese';
import { sanitizeVietQRMemo } from '@/lib/vietqr';
import { formatPaymentAccount } from '@/lib/ledger';
import { ModalDialog } from '@/components/ui/ModalDialog';
import type {
  Customer,
  DebtPayment,
  DebtReminder,
  Order,
  ShopProfile,
} from '@/types/database';
import { CollectDebtModal } from './CollectDebtModal';
import { ReminderModal } from './ReminderModal';
import { VietQRModal } from '@/components/qr/VietQRModal';

interface DebtCustomerDrawerProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  profile: ShopProfile | null;
  initialOpenCollect?: boolean;
  onDataUpdated: () => void;
}

export function DebtCustomerDrawer(props: DebtCustomerDrawerProps) {
  if (!props.open || !props.customer) return null;
  return (
    <DebtCustomerDrawerBody
      key={props.customer.id}
      {...props}
      customer={props.customer}
    />
  );
}

function DebtCustomerDrawerBody({
  onClose,
  customer,
  profile,
  initialOpenCollect = false,
  onDataUpdated,
}: Omit<DebtCustomerDrawerProps, 'open' | 'customer'> & { customer: Customer }) {
  const [unpaidOrders, setUnpaidOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [reminders, setReminders] = useState<DebtReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingInfo, setEditingInfo] = useState(false);
  const [editName, setEditName] = useState(customer.name);
  const [editPhone, setEditPhone] = useState(customer.phone ?? '');
  const [editAddress, setEditAddress] = useState(customer.address ?? '');
  const [editNote, setEditNote] = useState(customer.note ?? '');
  const [savingInfo, setSavingInfo] = useState(false);

  const [collectOpen, setCollectOpen] = useState(
    () => Boolean(initialOpenCollect && customer.total_debt > 0)
  );
  const [collectOrderId, setCollectOrderId] = useState<string | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [copiedZalo, setCopiedZalo] = useState(false);

  const fetchCustomerDetails = useCallback(async (customerId: string) => {
    const supabase = createClient();
    const [{ data: ordRows }, { data: payRows }, { data: remRows }] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .in('payment_status', ['unpaid', 'partial'])
        .order('purchased_at', { ascending: true }),
      supabase
        .from('debt_payments')
        .select('*')
        .eq('customer_id', customerId)
        .order('paid_at', { ascending: false })
        .limit(30),
      supabase
        .from('debt_reminders')
        .select('*')
        .eq('customer_id', customerId)
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true }),
    ]);

    setUnpaidOrders((ordRows as Order[]) ?? []);
    setPayments((payRows as DebtPayment[]) ?? []);
    setReminders((remRows as DebtReminder[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customer.id)
        .in('payment_status', ['unpaid', 'partial'])
        .order('purchased_at', { ascending: true }),
      supabase
        .from('debt_payments')
        .select('*')
        .eq('customer_id', customer.id)
        .order('paid_at', { ascending: false })
        .limit(30),
      supabase
        .from('debt_reminders')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true }),
    ]).then(([{ data: ordRows }, { data: payRows }, { data: remRows }]) => {
      if (!active) return;
      setUnpaidOrders((ordRows as Order[]) ?? []);
      setPayments((payRows as DebtPayment[]) ?? []);
      setReminders((remRows as DebtReminder[]) ?? []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [customer.id]);

  async function handleSaveInfo(e: FormEvent) {
    e.preventDefault();
    if (!editName.trim()) return;
    setSavingInfo(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('customers')
        .update({
          name: editName.trim(),
          search_text: stripVietnamese(
            `${editName.trim()} ${editPhone.trim()} ${editAddress.trim()}`
          ),
          phone: editPhone.trim() || null,
          address: editAddress.trim() || null,
          note: editNote.trim() || null,
        })
        .eq('id', customer.id);
      if (error) throw error;
      setEditingInfo(false);
      onDataUpdated();
    } finally {
      setSavingInfo(false);
    }
  }

  async function handleDismissReminder(id: string) {
    const supabase = createClient();
    await supabase.from('debt_reminders').update({ status: 'dismissed' }).eq('id', id);
    fetchCustomerDetails(customer.id);
  }

  async function handleCopyZaloMessage() {
    const text = buildZaloDebtMessage({
      shopName: profile?.shop_name || 'Shop của Mẹ',
      customerName: customer.name,
      amount: customer.total_debt,
      bankName: profile?.bank_name,
      accountNo: profile?.bank_account_no,
      accountName: profile?.bank_account_name,
      memo: sanitizeVietQRMemo(`PT NO ${customer.name}`),
      orderCodes: unpaidOrders.map((o) => o.order_code),
    });

    try {
      await navigator.clipboard.writeText(text);
      setCopiedZalo(true);
      setTimeout(() => setCopiedZalo(false), 2200);
    } catch {
      setQrOpen(true);
    }
  }

  const todayVN = getTodayVN();
  const isOverdue =
    customer.total_debt > 0 && customer.next_due_date && customer.next_due_date < todayVN;
  const isDueToday =
    customer.total_debt > 0 && customer.next_due_date && customer.next_due_date === todayVN;

  return (
    <>
      <ModalDialog
        open={true}
        onClose={onClose}
        ariaLabelledBy="debt-customer-drawer-title"
        backdropClassName="animate-backdrop-in glass-backdrop fixed inset-0 z-40 flex items-end justify-end p-0 sm:items-stretch"
        panelClassName="animate-sheet-up sm:animate-drawer-in glass-modal max-h-[93dvh] w-full overflow-y-auto rounded-t-[28px] sm:h-full sm:max-h-dvh sm:max-w-[520px] sm:rounded-l-[28px] sm:rounded-tr-none"
      >
        <div className="glass-modal-header sticky top-0 z-10 flex items-start justify-between gap-2 px-4 py-3.5 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2
                id="debt-customer-drawer-title"
                className="min-w-0 truncate text-[20px] font-bold text-[var(--text-primary)]"
              >
                {customer.name}
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (!editingInfo) {
                    setEditName(customer.name);
                    setEditPhone(customer.phone ?? '');
                    setEditAddress(customer.address ?? '');
                    setEditNote(customer.note ?? '');
                  }
                  setEditingInfo((v) => !v);
                }}
                aria-label="Sửa thông tin khách"
                aria-pressed={editingInfo}
                className={`press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  editingInfo
                    ? 'glass-chip-active'
                    : 'glass-solid-control text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            {(customer.phone || customer.address) && (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--text-secondary)]">
                {customer.phone && (
                  <span className="font-mono-tabular inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0 opacity-75" />
                    <span>{customer.phone}</span>
                  </span>
                )}
                {customer.address && (
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 opacity-75" />
                    <span className="truncate">{customer.address}</span>
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="glass-solid-control press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:p-5 sm:pb-5">
          {editingInfo && (
            <form
              onSubmit={handleSaveInfo}
              className="glass-well animate-fade-in space-y-2.5 rounded-[22px] p-4"
            >
              <p className="text-[14px] font-bold text-[var(--text-primary)]">
                Sửa thông tin khách
              </p>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Họ tên"
                aria-label="Họ tên khách hàng"
                className="glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Số điện thoại"
                aria-label="Số điện thoại khách hàng"
                className="glass-input font-mono-tabular min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Địa chỉ"
                aria-label="Địa chỉ khách hàng"
                className="glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />
              <input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Ghi chú"
                aria-label="Ghi chú khách hàng"
                className="glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingInfo(false)}
                  className="glass-solid-control press-tactile min-h-[44px] rounded-full px-4 text-[13px] font-semibold text-[var(--text-primary)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingInfo}
                  className="glass-btn-primary press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-5 text-[13px] font-semibold disabled:opacity-60"
                >
                  {savingInfo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>Lưu</span>
                </button>
              </div>
            </form>
          )}

          {customer.note && !editingInfo && (
            <div className="glass-well break-words rounded-[18px] px-3.5 py-2.5 text-[13px] text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">Ghi chú:</span>{' '}
              {customer.note}
            </div>
          )}

          {/* Prominent Debt Balance Well & Action Grid */}
          <div className="glass-well rounded-[22px] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] font-semibold text-[var(--text-secondary)]">
                Đang nợ
              </span>
              {isOverdue ? (
                <span className="glass-badge-overdue inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Quá hạn</span>
                </span>
              ) : isDueToday ? (
                <span className="glass-badge-debt inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>Đến hạn hôm nay</span>
                </span>
              ) : customer.total_debt <= 0 ? (
                <span className="glass-badge-paid inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                  Đã hết nợ
                </span>
              ) : null}
            </div>

            <p
              className={`font-mono-tabular mt-1.5 break-words text-[24px] font-bold ${
                customer.total_debt > 0
                  ? 'text-[var(--status-debt)]'
                  : 'text-[var(--brand-jade-text)]'
              }`}
            >
              {formatVND(customer.total_debt)}
            </p>

            {customer.next_due_date && customer.total_debt > 0 && (
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                Hẹn thu:{' '}
                <strong className="font-mono-tabular text-[var(--text-primary)]">
                  {formatDateVN(customer.next_due_date)}
                </strong>
              </p>
            )}

            {customer.total_debt > 0 && (
              <>
                <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCollectOrderId(null);
                      setCollectOpen(true);
                    }}
                    className="glass-btn-primary press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[14px] font-semibold"
                  >
                    <Banknote className="h-4 w-4 shrink-0" />
                    <span className="truncate">Thu nợ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrOpen(true)}
                    className="glass-solid-control press-tactile flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[14px] font-semibold text-[var(--brand-jade-text)]"
                  >
                    <QrCode className="h-4 w-4 shrink-0" />
                    <span className="truncate">Tạo QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderOpen(true)}
                    className="glass-solid-control press-tactile col-span-2 flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[14px] font-semibold text-[var(--text-primary)] sm:col-span-1"
                  >
                    <BellPlus className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
                    <span className="truncate">Nhắc nợ</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void handleCopyZaloMessage()}
                  className={`press-tactile mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-semibold ${
                    copiedZalo ? 'glass-badge-paid' : 'glass-solid-control text-[var(--text-primary)]'
                  }`}
                >
                  {copiedZalo ? (
                    <Check className="h-4 w-4 shrink-0" />
                  ) : (
                    <Copy className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
                  )}
                  <span>{copiedZalo ? 'Đã chép tin nhắn Zalo' : 'Sao chép tin nhắn Zalo'}</span>
                </button>
              </>
            )}
          </div>

          {loading ? (
            <div aria-busy="true" aria-label="Đang tải chi tiết công nợ" className="space-y-3">
              <div className="glass-well rounded-[18px] p-4">
                <div className="skeleton-shimmer h-4 w-32 rounded-[10px]" />
                <div className="skeleton-shimmer mt-2.5 h-12 w-full rounded-[12px]" />
              </div>
              <div className="glass-well rounded-[18px] p-4">
                <div className="skeleton-shimmer h-4 w-28 rounded-[10px]" />
                <div className="skeleton-shimmer mt-2.5 h-12 w-full rounded-[12px]" />
              </div>
            </div>
          ) : (
            <>
              {reminders.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
                      Lịch nhắc
                    </h3>
                    <span className="glass-badge-neutral font-mono-tabular rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                      {reminders.length}
                    </span>
                  </div>
                  <div className="glass-well divide-y divide-[var(--glass-border-subtle)] rounded-[18px]">
                    {reminders.map((rem) => (
                      <div
                        key={rem.id}
                        className="flex items-center justify-between gap-2.5 px-3.5 py-3 text-[13px]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-mono-tabular font-semibold text-[var(--brand-jade-text)]">
                            {formatDateTimeVN(rem.scheduled_for)}
                          </p>
                          {rem.message && (
                            <p className="mt-0.5 break-words text-[var(--text-secondary)]">
                              {rem.message}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDismissReminder(rem.id)}
                          aria-label="Xóa lịch nhắc"
                          className="glass-solid-control press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--status-overdue)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
                    Đơn còn nợ
                  </h3>
                  <span
                    className={`font-mono-tabular rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                      unpaidOrders.length > 0 ? 'glass-badge-debt' : 'glass-badge-paid'
                    }`}
                  >
                    {unpaidOrders.length}
                  </span>
                </div>
                {unpaidOrders.length === 0 ? (
                  <p className="glass-well rounded-[18px] p-4 text-[13px] text-[var(--text-secondary)]">
                    Không còn đơn nợ.
                  </p>
                ) : (
                  <div className="glass-well divide-y divide-[var(--glass-border-subtle)] rounded-[18px]">
                    {unpaidOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-mono-tabular truncate text-[14px] font-bold text-[var(--text-primary)]">
                            {ord.order_code}
                          </p>
                          <p className="font-mono-tabular mt-0.5 text-[12px] text-[var(--text-secondary)]">
                            {formatDateVN(ord.purchased_at || ord.created_at)} · Tổng{' '}
                            {formatVND(ord.total_amount)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5">
                          <span className="font-mono-tabular text-[14px] font-bold text-[var(--status-debt)]">
                            {formatVND(ord.remaining_amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setCollectOrderId(ord.id);
                              setCollectOpen(true);
                            }}
                            className="glass-pill-jade press-tactile min-h-[44px] shrink-0 rounded-full px-3.5 text-[12px] font-semibold"
                          >
                            Thu đơn này
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
                    Lịch sử thu
                  </h3>
                  <span className="glass-badge-neutral font-mono-tabular rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                    {payments.length}
                  </span>
                </div>
                {payments.length === 0 ? (
                  <p className="glass-well rounded-[18px] p-4 text-[13px] text-[var(--text-secondary)]">
                    Chưa có đợt thu nào.
                  </p>
                ) : (
                  <div className="glass-well divide-y divide-[var(--glass-border-subtle)] rounded-[18px]">
                    {payments.map((pay) => (
                      <div
                        key={pay.id}
                        className="flex items-center justify-between gap-2.5 px-3.5 py-3 text-[13px]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="break-words font-semibold text-[var(--text-primary)]">
                            {pay.note || 'Thu tiền'}
                            {pay.payment_account
                              ? ` · TK ${formatPaymentAccount(pay.payment_account, pay.payment_account_note)}`
                              : ''}
                          </p>
                          <p className="font-mono-tabular mt-0.5 text-[12px] text-[var(--text-secondary)]">
                            {formatDateVN(pay.paid_at)} ·{' '}
                            {pay.payment_method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}
                          </p>
                        </div>
                        <span className="glass-badge-paid font-mono-tabular shrink-0 rounded-full px-2.5 py-1 text-[13px] font-bold">
                          +{formatVND(pay.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </ModalDialog>

      <CollectDebtModal
        open={collectOpen}
        onClose={() => setCollectOpen(false)}
        customer={customer}
        unpaidOrders={unpaidOrders}
        initialOrderId={collectOrderId}
        onCollected={() => {
          fetchCustomerDetails(customer.id);
          onDataUpdated();
        }}
      />

      <ReminderModal
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        customer={customer}
        unpaidOrders={unpaidOrders}
        onSaved={() => {
          fetchCustomerDetails(customer.id);
          onDataUpdated();
        }}
      />

      <VietQRModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        profile={profile}
        customerName={customer.name}
        totalCustomerDebt={customer.total_debt}
        unpaidOrders={unpaidOrders}
      />
    </>
  );
}
