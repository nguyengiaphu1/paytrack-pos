'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, LogOut, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { VIETNAM_BANKS } from '@/lib/vietqr';
import type { InvoiceFormat, ShopProfile } from '@/types/database';
import { PushNotificationSetup } from '@/components/pwa/PushNotificationSetup';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [shopName, setShopName] = useState('Tạp Hóa Mẹ');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bankBin, setBankBin] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [digestHour, setDigestHour] = useState('08:30');
  const [invoiceFormat, setInvoiceFormat] = useState<InvoiceFormat>('a5');
  const [showCumulativeDebt, setShowCumulativeDebt] = useState(true);
  const [showQrOnInvoice, setShowQrOnInvoice] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('shop_profiles')
      .select('*')
      .maybeSingle()
      .then(({ data }) => {
        const p = data as ShopProfile | null;
        if (p) {
          setShopName(p.shop_name);
          setPhone(p.phone ?? '');
          setAddress(p.address ?? '');
          setBankBin(p.bank_bin ?? '');
          setBankName(p.bank_name ?? '');
          setBankAccountNo(p.bank_account_no ?? '');
          setBankAccountName(p.bank_account_name ?? '');
          setDigestEnabled(p.reminder_digest_enabled);
          setDigestHour(p.reminder_default_hour || '08:30');
          setInvoiceFormat(p.default_invoice_format || 'a5');
          setShowCumulativeDebt(p.default_show_cumulative_debt);
          setShowQrOnInvoice(p.default_show_qr_on_invoice);
        }
        setLoading(false);
      });
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSavedMsg(null);

    if (bankBin.trim() && !/^\d{6}$/.test(bankBin.trim())) {
      setErrorMsg('Mã BIN ngân hàng phải gồm đúng 6 chữ số (chọn từ danh sách ngân hàng).');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Phiên đăng nhập hết hạn');

      const { error } = await supabase.from('shop_profiles').upsert(
        {
          user_id: user.id,
          shop_name: shopName.trim() || 'Tạp Hóa Mẹ',
          phone: phone.trim() || null,
          address: address.trim() || null,
          bank_bin: bankBin.trim() || null,
          bank_name: bankName.trim() || null,
          bank_account_no: bankAccountNo.replace(/\s+/g, '').trim() || null,
          bank_account_name: bankAccountName.trim().toUpperCase() || null,
          reminder_digest_enabled: digestEnabled,
          reminder_default_hour: digestHour || '08:30',
          default_invoice_format: invoiceFormat,
          default_show_cumulative_debt: showCumulativeDebt,
          default_show_qr_on_invoice: showQrOnInvoice,
        },
        { onConflict: 'user_id' }
      );

      if (error) throw error;
      setSavedMsg('Đã lưu cài đặt cửa hàng lên Cloud!');
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể lưu cài đặt');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-[760px] px-3 py-4 sm:px-6 lg:py-5">
      <div className="mb-4">
        <h1 className="text-[20px] font-bold tracking-[-0.015em] lg:text-[24px]">
          Cài đặt cửa hàng
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)]">
          Thông tin in hóa đơn, ngân hàng nhận VietQR, thông báo đa thiết bị &amp; tài khoản
        </p>
      </div>

      <div className="space-y-5">
        {/* Push Notification Setup Widget */}
        <PushNotificationSetup />

        {loading ? (
          <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-center text-[14px] text-[var(--text-secondary)]">
            Đang tải cài đặt...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {errorMsg && (
              <div className="rounded-lg border border-[#FCA5A5] bg-[var(--status-overdue-bg)] px-4 py-3 text-[14px] font-medium text-[var(--status-overdue)]">
                {errorMsg}
              </div>
            )}

            {savedMsg && (
              <div className="flex items-center gap-2 rounded-lg border border-[#5EEAD4] bg-[var(--status-paid-bg)] px-4 py-3 text-[14px] font-medium text-[var(--status-paid)]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{savedMsg}</span>
              </div>
            )}

            {/* Shop Identity */}
            <section className="space-y-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
              <h2 className="text-[16px] font-bold">Thông tin cửa hàng (in trên hóa đơn)</h2>
              <div>
                <label className="mb-1 block text-[14px] font-medium">Tên cửa hàng *</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] px-3.5 outline-none focus:border-[var(--brand-jade)]"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[14px] font-medium">Số điện thoại</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0901234567"
                    className="font-mono-tabular min-h-[46px] w-full rounded-lg border border-[var(--border-default)] px-3.5 outline-none focus:border-[var(--brand-jade)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[14px] font-medium">Địa chỉ</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Số nhà, đường, quận..."
                    className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] px-3.5 outline-none focus:border-[var(--brand-jade)]"
                  />
                </div>
              </div>
            </section>

            {/* VietQR Bank Configuration */}
            <section
              id="bank"
              className="space-y-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4"
            >
              <h2 className="text-[16px] font-bold">Tài khoản ngân hàng nhận VietQR</h2>
              <div>
                <label className="mb-1 block text-[14px] font-medium">Ngân hàng</label>
                <select
                  value={bankBin}
                  onChange={(e) => {
                    const selectedBin = e.target.value;
                    setBankBin(selectedBin);
                    const found = VIETNAM_BANKS.find((b) => b.bin === selectedBin);
                    if (found) setBankName(found.shortName);
                  }}
                  className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3"
                >
                  <option value="">-- Chọn ngân hàng --</option>
                  {VIETNAM_BANKS.map((b) => (
                    <option key={b.bin} value={b.bin}>
                      {b.shortName} — {b.name} ({b.bin})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[14px] font-medium">Số tài khoản</label>
                  <input
                    type="text"
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value)}
                    placeholder="VD: 0123456789"
                    className="font-mono-tabular min-h-[46px] w-full rounded-lg border border-[var(--border-default)] px-3.5 outline-none focus:border-[var(--brand-jade)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[14px] font-medium">
                    Tên chủ tài khoản (không dấu)
                  </label>
                  <input
                    type="text"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="NGUYEN THI LAN"
                    className="min-h-[46px] w-full rounded-lg border border-[var(--border-default)] px-3.5 uppercase outline-none focus:border-[var(--brand-jade)]"
                  />
                </div>
              </div>
            </section>

            {/* Reminder & Invoice Defaults */}
            <section className="space-y-4 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
              <h2 className="text-[16px] font-bold">Mặc định nhắc nợ &amp; hóa đơn</h2>

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] pb-3">
                <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-medium">
                  <input
                    type="checkbox"
                    checked={digestEnabled}
                    onChange={(e) => setDigestEnabled(e.target.checked)}
                    className="h-4 w-4 accent-[var(--brand-jade)]"
                  />
                  <span>Gửi thông báo tổng hợp đầu ngày các khoản đến hạn/quá hạn</span>
                </label>
                <input
                  type="time"
                  value={digestHour}
                  onChange={(e) => setDigestHour(e.target.value)}
                  aria-label="Giờ gửi tổng hợp sáng"
                  className="font-mono-tabular min-h-[42px] rounded-lg border border-[var(--border-default)] px-3"
                />
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="mb-1 block text-[14px] font-medium">
                    Khổ hóa đơn mặc định
                  </label>
                  <select
                    value={invoiceFormat}
                    onChange={(e) => setInvoiceFormat(e.target.value as InvoiceFormat)}
                    className="min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 sm:w-64"
                  >
                    <option value="a5">Khổ A5 / Ảnh PNG gửi Zalo</option>
                    <option value="80mm">Khổ nhiệt 80mm (máy in bill)</option>
                  </select>
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 text-[14px]">
                  <input
                    type="checkbox"
                    checked={showCumulativeDebt}
                    onChange={(e) => setShowCumulativeDebt(e.target.checked)}
                    className="h-4 w-4 accent-[var(--brand-jade)]"
                  />
                  <span>Mặc định hiển thị công nợ lũy kế (Nợ cũ + Đơn này − Đã trả)</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2.5 text-[14px]">
                  <input
                    type="checkbox"
                    checked={showQrOnInvoice}
                    onChange={(e) => setShowQrOnInvoice(e.target.checked)}
                    className="h-4 w-4 accent-[var(--brand-jade)]"
                  />
                  <span>Mặc định kèm mã VietQR trên hóa đơn</span>
                </label>
              </div>
            </section>

            <button
              type="submit"
              disabled={saving}
              className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-5 text-[16px] font-bold text-white hover:bg-[var(--brand-jade-hover)] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              <span>Lưu tất cả cài đặt</span>
            </button>
          </form>
        )}

        {/* Logout */}
        <section className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-bold">Tài khoản đăng nhập</p>
              <p className="text-[13px] text-[var(--text-secondary)]">
                Đăng xuất khỏi thiết bị này (dữ liệu vẫn an toàn trên Cloud).
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-[46px] items-center gap-2 rounded-lg border border-[#FCA5A5] px-4 text-[14px] font-semibold text-[var(--status-overdue)] hover:bg-[var(--status-overdue-bg)]"
            >
              <LogOut className="h-4 w-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
