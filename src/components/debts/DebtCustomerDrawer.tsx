'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Banknote,
  BellPlus,
  Check,
  Loader2,
  Pencil,
  Phone,
  QrCode,
  Trash2,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  formatDateTimeVN,
  formatDateVN,
  formatVND,
  stripVietnamese,
} from '@/lib/vietnamese';
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
  onDataUpdated,
}: Omit<DebtCustomerDrawerProps, 'open' | 'customer'> & { customer: Customer }) {
  const [unpaidOrders, setUnpaidOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [reminders, setReminders] = useState<DebtReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingInfo, setEditingInfo] = useState(false);
  const [editName, setEditName] = useState(customer.name);
  const [editPhone, setEditPhone] = useState(customer.phone ?? '');
  const [editNote, setEditNote] = useState(customer.note ?? '');
  const [savingInfo, setSavingInfo] = useState(false);

  const [collectOpen, setCollectOpen] = useState(false);
  const [collectOrderId, setCollectOrderId] = useState<string | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const fetchCustomerDetails = useCallback(async (customerId: string) => {
    const supabase = createClient();
    const [{ data: ordRows }, { data: payRows }, { data: remRows }] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .in('payment_status', ['unpaid', 'partial'])
        .order('created_at', { ascending: true }),
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
        .order('created_at', { ascending: true }),
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
          search_text: stripVietnamese(`${editName.trim()} ${editPhone.trim()}`),
          phone: editPhone.trim() || null,
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

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết công nợ ${customer.name}`}
      >
        <div className="max-h-[93dvh] w-full max-w-[560px] overflow-y-auto rounded-t-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] sm:rounded-[10px]">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="min-w-0 truncate text-[18px] font-bold">{customer.name}</h2>
                <button
                  type="button"
                  onClick={() => setEditingInfo((v) => !v)}
                  aria-label="Sửa thông tin khách"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              {customer.phone && (
                <p className="font-mono-tabular flex items-center gap-1 text-[13px] text-[var(--text-secondary)]">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{customer.phone}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 p-4">
            {editingInfo && (
              <form
                onSubmit={handleSaveInfo}
                className="space-y-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3.5"
              >
                <p className="text-[13px] font-bold">Chỉnh sửa thông tin khách hàng</p>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Tên khách hàng"
                  className="min-h-[42px] w-full rounded-lg border border-[var(--border-default)] bg-white px-3"
                />
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Số điện thoại"
                  className="font-mono-tabular min-h-[42px] w-full rounded-lg border border-[var(--border-default)] bg-white px-3"
                />
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Địa chỉ / Ghi chú"
                  className="min-h-[42px] w-full rounded-lg border border-[var(--border-default)] bg-white px-3"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingInfo(false)}
                    className="min-h-[40px] rounded-lg border border-[var(--border-default)] bg-white px-3 text-[13px] font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={savingInfo}
                    className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[var(--brand-jade)] px-4 text-[13px] font-semibold text-white"
                  >
                    {savingInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span>Lưu</span>
                  </button>
                </div>
              </form>
            )}

            {customer.note && !editingInfo && (
              <p className="break-words rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3.5 py-2 text-[13px] text-[var(--text-secondary)]">
                Ghi chú: {customer.note}
              </p>
            )}

            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[14px] font-medium text-[var(--text-secondary)]">
                  Tổng công nợ hiện tại
                </span>
                <span
                  className={`font-mono-tabular text-[20px] font-bold sm:text-[24px] ${
                    customer.total_debt > 0 ? 'text-[var(--status-debt)]' : 'text-[var(--brand-jade)]'
                  }`}
                >
                  {formatVND(customer.total_debt)}
                </span>
              </div>
              {customer.next_due_date && customer.total_debt > 0 && (
                <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                  Hạn thu gần nhất:{' '}
                  <strong className="font-mono-tabular text-[var(--text-primary)]">
                    {formatDateVN(customer.next_due_date)}
                  </strong>
                </p>
              )}

              {customer.total_debt > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCollectOrderId(null);
                      setCollectOpen(true);
                    }}
                    className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-jade)] px-2.5 text-[14px] font-semibold text-white hover:bg-[var(--brand-jade-hover)]"
                  >
                    <Banknote className="h-4 w-4 shrink-0" />
                    <span className="truncate">Thu nợ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrOpen(true)}
                    className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border border-[var(--brand-jade)] bg-white px-2.5 text-[14px] font-semibold text-[var(--brand-jade)] hover:bg-[var(--status-paid-bg)]"
                  >
                    <QrCode className="h-4 w-4 shrink-0" />
                    <span className="truncate">Tạo QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderOpen(true)}
                    className="col-span-2 flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-white px-2.5 text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] sm:col-span-1"
                  >
                    <BellPlus className="h-4 w-4 shrink-0" />
                    <span className="truncate">Hẹn nhắc</span>
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <p className="py-4 text-center text-[14px] text-[var(--text-secondary)]">
                Đang tải chi tiết công nợ...
              </p>
            ) : (
              <>
                {reminders.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-[14px] font-bold">Lịch nhắc sắp tới</h3>
                    <div className="divide-y divide-[var(--border-default)] rounded-lg border border-[var(--border-default)]">
                      {reminders.map((rem) => (
                        <div
                          key={rem.id}
                          className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-[13px]"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-mono-tabular font-semibold text-[var(--brand-jade)]">
                              {formatDateTimeVN(rem.scheduled_for)}
                            </p>
                            {rem.message && (
                              <p className="break-words text-[var(--text-secondary)]">
                                {rem.message}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDismissReminder(rem.id)}
                            aria-label="Xóa lịch nhắc"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--status-overdue-bg)] hover:text-[var(--status-overdue)]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="mb-2 text-[14px] font-bold">
                    Đơn hàng còn nợ ({unpaidOrders.length})
                  </h3>
                  {unpaidOrders.length === 0 ? (
                    <p className="rounded-lg border border-[var(--border-default)] p-3.5 text-[13px] text-[var(--text-secondary)]">
                      Khách không còn đơn nào chưa thanh toán.
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--border-default)] rounded-lg border border-[var(--border-default)]">
                      {unpaidOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-mono-tabular truncate text-[13px] font-bold">
                              {ord.order_code}
                            </p>
                            <p className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
                              {formatDateTimeVN(ord.created_at)} · Tổng {formatVND(ord.total_amount)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="font-mono-tabular text-[14px] font-bold text-[var(--status-debt)]">
                              {formatVND(ord.remaining_amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setCollectOrderId(ord.id);
                                setCollectOpen(true);
                              }}
                              className="min-h-[36px] shrink-0 rounded-md border border-[var(--brand-jade)] px-2.5 text-[12px] font-semibold text-[var(--brand-jade)] hover:bg-[var(--status-paid-bg)]"
                            >
                              Thu đơn
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-[14px] font-bold">
                    Lịch sử trả tiền ({payments.length})
                  </h3>
                  {payments.length === 0 ? (
                    <p className="rounded-lg border border-[var(--border-default)] p-3.5 text-[13px] text-[var(--text-secondary)]">
                      Chưa có lịch sử thu nợ.
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--border-default)] rounded-lg border border-[var(--border-default)]">
                      {payments.map((pay) => (
                        <div
                          key={pay.id}
                          className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-[13px]"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="break-words font-medium text-[var(--text-primary)]">
                              {pay.note || 'Thu tiền'} ({pay.payment_method === 'transfer' ? 'CK' : 'Tiền mặt'})
                            </p>
                            <p className="font-mono-tabular text-[12px] text-[var(--text-secondary)]">
                              {formatDateTimeVN(pay.paid_at)}
                            </p>
                          </div>
                          <span className="shrink-0 font-mono-tabular font-bold text-[var(--brand-jade)]">
                            +{formatVND(pay.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

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
