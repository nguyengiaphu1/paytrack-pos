'use client';

import { useState, type FormEvent } from 'react';
import { BellPlus, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatVND, getTodayVN } from '@/lib/vietnamese';
import { formatErrorMessageVN } from '@/lib/errors';
import type { Customer, Order } from '@/types/database';
import { ModalDialog } from '@/components/ui/ModalDialog';

interface ReminderModalProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  unpaidOrders: Order[];
  onSaved: () => void;
}

const QUICK_TIMES = ['08:30', '09:00', '14:00', '19:00'] as const;

function shiftDateVN(baseYYYYMMDD: string, offsetDays: number): string {
  const dt = new Date(`${baseYYYYMMDD}T12:00:00+07:00`);
  dt.setUTCDate(dt.getUTCDate() + offsetDays);
  return getTodayVN(dt);
}

export function ReminderModal(props: ReminderModalProps) {
  if (!props.open || !props.customer) return null;
  return (
    <ReminderModalBody
      key={props.customer.id}
      {...props}
      customer={props.customer}
    />
  );
}

function ReminderModalBody({
  onClose,
  customer,
  unpaidOrders,
  onSaved,
}: Omit<ReminderModalProps, 'open' | 'customer'> & { customer: Customer }) {
  const todayVN = getTodayVN();
  const quickDates = [
    { label: 'Hôm nay', value: todayVN },
    { label: 'Ngày mai', value: shiftDateVN(todayVN, 1) },
    { label: '+3 ngày', value: shiftDateVN(todayVN, 3) },
  ] as const;

  const [date, setDate] = useState(customer.next_due_date || todayVN);
  const [time, setTime] = useState('09:00');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState(
    `Nhắc thu ${customer.name} khoản nợ ${formatVND(customer.total_debt)}`
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSaving(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Phiên đăng nhập đã hết hạn');

      const scheduledIso = new Date(`${date}T${time}:00+07:00`).toISOString();

      const { error: insertErr } = await supabase.from('debt_reminders').insert({
        user_id: user.id,
        customer_id: customer.id,
        order_id: orderId || null,
        reminder_type: 'custom',
        scheduled_for: scheduledIso,
        message: message.trim() || null,
        target_url: `/debts?customer=${customer.id}`,
        status: 'pending',
      });

      if (insertErr) throw insertErr;
      onSaved();
      onClose();
    } catch (err) {
      setError(formatErrorMessageVN(err, 'Không thể đặt lịch nhắc'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalDialog
      open={true}
      onClose={onClose}
      ariaLabelledBy="reminder-modal-title"
      backdropClassName="animate-backdrop-in glass-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      panelClassName="animate-sheet-up sm:animate-modal-in glass-modal max-h-[92dvh] w-full max-w-[460px] overflow-y-auto rounded-t-[28px] sm:rounded-[28px]"
    >
      <div className="glass-modal-header sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="glass-icon-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-[var(--brand-jade-text)]"
          >
            <BellPlus className="h-5 w-5" />
          </span>
          <h2
            id="reminder-modal-title"
            className="min-w-0 truncate text-[16px] font-bold text-[var(--text-primary)]"
          >
            Hẹn nhắc thu — {customer.name}
          </h2>
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

      <form
        onSubmit={handleSubmit}
        className="space-y-4 p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:p-5 sm:pb-5"
      >
        {error && (
          <div
            role="alert"
            className="glass-badge-overdue rounded-[16px] px-3.5 py-2.5 text-[14px] font-medium"
          >
            {error}
          </div>
        )}

        {/* Customer Debt Summary Well */}
        <div className="glass-well flex flex-wrap items-center justify-between gap-2 rounded-[20px] px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
              Khoản cần nhắc
            </p>
            <p className="truncate text-[14px] font-bold text-[var(--text-primary)]">
              {customer.name}
            </p>
          </div>
          <span className="glass-badge-debt font-mono-tabular shrink-0 rounded-full px-3 py-1 text-[14px] font-bold">
            {formatVND(customer.total_debt)}
          </span>
        </div>

        {/* Quick Date Pills */}
        <div>
          <p className="mb-1.5 text-[12px] font-semibold text-[var(--text-secondary)]">
            Chọn nhanh ngày
          </p>
          <div role="group" aria-label="Chọn nhanh ngày nhắc" className="flex flex-wrap gap-2">
            {quickDates.map((preset) => {
              const active = date === preset.value;
              return (
                <button
                  key={preset.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDate(preset.value)}
                  className={`press-tactile min-h-[44px] rounded-full px-3.5 text-[13px] ${
                    active ? 'glass-chip-active font-bold' : 'glass-chip font-semibold'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="min-w-0">
            <label
              htmlFor="reminder-date"
              className="mb-1.5 block text-[13px] font-semibold text-[var(--text-primary)]"
            >
              Ngày nhắc
            </label>
            <input
              id="reminder-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="glass-input font-mono-tabular min-h-[46px] w-full min-w-0 rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
            />
          </div>
          <div className="min-w-0">
            <label
              htmlFor="reminder-time"
              className="mb-1.5 block text-[13px] font-semibold text-[var(--text-primary)]"
            >
              Giờ nhắc (VN)
            </label>
            <input
              id="reminder-time"
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="glass-input font-mono-tabular min-h-[46px] w-full min-w-0 rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
            />
          </div>
        </div>

        {/* Quick Time Pills */}
        <div>
          <p className="mb-1.5 text-[12px] font-semibold text-[var(--text-secondary)]">
            Khung giờ gợi ý
          </p>
          <div role="group" aria-label="Chọn nhanh giờ nhắc" className="flex flex-wrap gap-2">
            {QUICK_TIMES.map((preset) => {
              const active = time === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTime(preset)}
                  className={`font-mono-tabular press-tactile min-h-[44px] rounded-full px-3.5 text-[13px] ${
                    active ? 'glass-chip-active font-bold' : 'glass-chip font-semibold'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>

        {unpaidOrders.length > 0 && (
          <div>
            <label
              htmlFor="reminder-order-select"
              className="mb-1.5 block text-[13px] font-semibold text-[var(--text-primary)]"
            >
              Gắn với đơn (tùy chọn)
            </label>
            <select
              id="reminder-order-select"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
            >
              <option value="">Toàn bộ công nợ của khách</option>
              {unpaidOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_code} ({formatVND(o.remaining_amount)})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label
            htmlFor="reminder-message"
            className="mb-1.5 block text-[13px] font-semibold text-[var(--text-primary)]"
          >
            Nội dung thông báo
          </label>
          <textarea
            id="reminder-message"
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="glass-input min-h-[84px] w-full rounded-[14px] p-3.5 text-[16px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="glass-btn-primary press-tactile flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-5 text-[15px] font-bold disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{saving ? 'Đang lưu lịch nhắc...' : 'Lưu lịch hẹn nhắc'}</span>
        </button>
      </form>
    </ModalDialog>
  );
}
