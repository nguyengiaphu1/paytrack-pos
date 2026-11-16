'use client';

import { useState, type FormEvent } from 'react';
import { BellPlus, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatVND, getTodayVN } from '@/lib/vietnamese';
import type { Customer, Order } from '@/types/database';

interface ReminderModalProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  unpaidOrders: Order[];
  onSaved: () => void;
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
  const [date, setDate] = useState(customer.next_due_date || getTodayVN());
  const [time, setTime] = useState('09:00');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState(
    `Nhắc thu ${customer.name} khoản nợ ${formatVND(customer.total_debt)}`
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
      setError(err instanceof Error ? err.message : 'Không thể đặt lịch nhắc');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Hẹn giờ nhắc thu nợ"
    >
      <div className="w-full max-w-[440px] rounded-t-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] sm:rounded-[10px]">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <BellPlus className="h-5 w-5 text-[var(--brand-jade)]" />
            <h2 className="text-[17px] font-bold">Hẹn nhắc thu — {customer.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {error && (
            <div className="rounded-lg border border-[#FCA5A5] bg-[var(--status-overdue-bg)] px-3 py-2 text-[14px] text-[var(--status-overdue)]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block text-[13px] font-medium">Ngày nhắc</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="font-mono-tabular min-h-[46px] w-full rounded-lg border border-[var(--border-default)] px-3"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium">Giờ nhắc (VN)</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="font-mono-tabular min-h-[46px] w-full rounded-lg border border-[var(--border-default)] px-3"
              />
            </div>
          </div>

          {unpaidOrders.length > 0 && (
            <div>
              <label className="mb-1 block text-[13px] font-medium">Gắn với đơn (tùy chọn)</label>
              <select
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3"
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
            <label className="mb-1 block text-[13px] font-medium">Nội dung thông báo</label>
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-default)] p-3 text-[15px] outline-none focus:border-[var(--brand-jade)]"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-4 text-[15px] font-semibold text-white hover:bg-[var(--brand-jade-hover)] disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Lưu lịch nhắc thu nợ</span>
          </button>
        </form>
      </div>
    </div>
  );
}
