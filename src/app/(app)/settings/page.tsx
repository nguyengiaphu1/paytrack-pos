'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpenCheck, CheckCircle2, Loader2, LogOut, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { VIETNAM_BANKS } from '@/lib/vietqr';
import { usePosData } from '@/components/providers/PosDataProvider';
import { useAppUser } from '@/components/shell/AppShell';
import type { InvoiceFormat, ShopProfile } from '@/types/database';
import { PushNotificationSetup } from '@/components/pwa/PushNotificationSetup';
import { SettingsThemeSelector } from '@/components/ui/ThemeToggle';
import { FetchErrorCard, SettingsPageSkeleton } from '@/components/ui/PageSkeletons';

export default function SettingsPage() {
  const {
    profile,
    profileLoaded,
    profileError,
    ensureProfile,
    refreshProfile,
    setProfileLocal,
  } = usePosData();
  const { openOnboarding } = useAppUser();

  useEffect(() => {
    void ensureProfile();
  }, [ensureProfile]);

  const loading = !profileLoaded && !profileError;

  return (
    <div className="mx-auto max-w-[760px] px-3 py-4 sm:px-6 lg:py-5">
      <div className="mb-4">
        <h1 className="text-[20px] font-bold tracking-[-0.015em] text-[var(--text-primary)] lg:text-[24px]">
          Cài đặt cửa hàng
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)]">
          Chỉnh giao diện Sáng/Tối, tên tiệm in hóa đơn, ngân hàng VietQR &amp; nhắc nợ tự động
        </p>
      </div>

      <div className="space-y-5">
        {/* 1. Giao diện Sáng / Tối (Theo thiết bị / Sáng / Tối) */}
        <SettingsThemeSelector />

        {/* 2. Thông báo nhắc nợ trên thiết bị */}
        <PushNotificationSetup />

        {profileError && !profile ? (
          <FetchErrorCard
            title="Chưa tải được cài đặt cửa hàng"
            message={profileError}
            onRetry={() => void refreshProfile()}
          />
        ) : loading ? (
          <SettingsPageSkeleton />
        ) : (
          <SettingsFormBody
            key={profile?.updated_at ?? 'new-profile'}
            profile={profile}
            setProfileLocal={setProfileLocal}
            onReplayOnboarding={openOnboarding}
          />
        )}
      </div>
    </div>
  );
}

function SettingsFormBody({
  profile,
  setProfileLocal,
  onReplayOnboarding,
}: {
  profile: ShopProfile | null;
  setProfileLocal: (profile: ShopProfile) => void;
  onReplayOnboarding: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [shopName, setShopName] = useState(profile?.shop_name ?? 'Tạp Hóa Mẹ');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [bankBin, setBankBin] = useState(profile?.bank_bin ?? '');
  const [bankName, setBankName] = useState(profile?.bank_name ?? '');
  const [bankAccountNo, setBankAccountNo] = useState(profile?.bank_account_no ?? '');
  const [bankAccountName, setBankAccountName] = useState(profile?.bank_account_name ?? '');
  const [digestEnabled, setDigestEnabled] = useState(profile?.reminder_digest_enabled ?? true);
  const [digestHour, setDigestHour] = useState(profile?.reminder_default_hour || '08:30');
  const [invoiceFormat, setInvoiceFormat] = useState<InvoiceFormat>(
    profile?.default_invoice_format || 'a5'
  );
  const [showCumulativeDebt, setShowCumulativeDebt] = useState(
    profile?.default_show_cumulative_debt ?? true
  );
  const [showQrOnInvoice, setShowQrOnInvoice] = useState(
    profile?.default_show_qr_on_invoice ?? true
  );

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
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

      const { data: savedRow, error } = await supabase
        .from('shop_profiles')
        .upsert(
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
        )
        .select('*')
        .single();

      if (error) throw error;
      if (savedRow) setProfileLocal(savedRow as ShopProfile);
      setSavedMsg('Đã lưu toàn bộ cài đặt cửa hàng thành công!');
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
    <>
      <form onSubmit={handleSave} className="space-y-5">
        {errorMsg && (
          <div
            role="alert"
            className="animate-fade-in rounded-lg border border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] px-4 py-3 text-[14px] font-medium text-[var(--status-overdue)]"
          >
            {errorMsg}
          </div>
        )}

        {savedMsg && (
          <div
            role="status"
            className="animate-fade-in flex items-center gap-2 rounded-lg border border-[var(--status-paid-border)] bg-[var(--status-paid-bg)] px-4 py-3 text-[14px] font-semibold text-[var(--status-paid)]"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{savedMsg}</span>
          </div>
        )}

        {/* 3. Thông tin cửa hàng */}
        <section className="space-y-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div>
            <h2 className="text-[16px] font-bold text-[var(--text-primary)]">
              3. Thông tin cửa hàng (in lên hóa đơn)
            </h2>
            <p className="text-[13px] text-[var(--text-secondary)]">
              Tên tiệm và số điện thoại sẽ hiện ở đầu phiếu tính tiền gửi cho khách.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]">
              Tên cửa hàng *
            </label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="min-h-[48px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]">
                Số điện thoại cửa hàng
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901234567"
                className="font-mono-tabular min-h-[48px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              />
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]">
                Địa chỉ
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Số nhà, đường, quận/huyện..."
                className="min-h-[48px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              />
            </div>
          </div>
        </section>

        {/* 4. Tài khoản ngân hàng nhận VietQR */}
        <section
          id="bank"
          className="space-y-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:p-5"
        >
          <div>
            <h2 className="text-[16px] font-bold text-[var(--text-primary)]">
              4. Tài khoản ngân hàng nhận chuyển khoản VietQR
            </h2>
            <p className="text-[13px] text-[var(--text-secondary)]">
              Điền 1 lần để tự tạo mã QR đúng số tiền khi thu nợ hoặc xuất hóa đơn cho khách.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]">
              Ngân hàng
            </label>
            <select
              value={bankBin}
              onChange={(e) => {
                const selectedBin = e.target.value;
                setBankBin(selectedBin);
                const found = VIETNAM_BANKS.find((b) => b.bin === selectedBin);
                if (found) setBankName(found.shortName);
              }}
              className="min-h-[48px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
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
            <div className="min-w-0">
              <label className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]">
                Số tài khoản nhận tiền
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={bankAccountNo}
                onChange={(e) => setBankAccountNo(e.target.value)}
                placeholder="VD: 0123456789"
                className="font-mono-tabular min-h-[48px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              />
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]">
                Tên chủ tài khoản (không dấu)
              </label>
              <input
                type="text"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="NGUYEN THI LAN"
                className="min-h-[48px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 uppercase text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              />
            </div>
          </div>
        </section>

        {/* 5. Mặc định nhắc nợ & hóa đơn */}
        <section className="space-y-4 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div>
            <h2 className="text-[16px] font-bold text-[var(--text-primary)]">
              5. Mặc định nhắc nợ &amp; mẫu hóa đơn
            </h2>
            <p className="text-[13px] text-[var(--text-secondary)]">
              Cài đặt sẵn khổ giấy và thông tin hiển thị khi bạn bấm In / Gửi hóa đơn.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] pb-3.5">
            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={digestEnabled}
                onChange={(e) => setDigestEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand-jade)]"
              />
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-[var(--text-primary)]">
                  Báo tổng hợp khách đến hạn mỗi ngày
                </span>
                <span className="block text-[12px] text-[var(--text-secondary)]">
                  Đến khung giờ đã chọn, tự gửi 1 thông báo nếu có khách còn nợ với &ldquo;Ngày hẹn
                  thu&rdquo; hôm nay hoặc đã quá hạn.
                </span>
              </span>
            </label>
            <input
              type="time"
              value={digestHour}
              onChange={(e) => setDigestHour(e.target.value)}
              aria-label="Giờ gửi tổng hợp sáng"
              className="font-mono-tabular min-h-[44px] shrink-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[14px] font-medium text-[var(--text-primary)]">
                Khổ hóa đơn mặc định
              </label>
              <select
                value={invoiceFormat}
                onChange={(e) => setInvoiceFormat(e.target.value as InvoiceFormat)}
                className="min-h-[48px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)] sm:w-72"
              >
                <option value="a5">Khổ A5 / Tải ảnh gửi Zalo (Khuyên dùng)</option>
                <option value="80mm">Khổ nhiệt 80mm (Máy in bill nhỏ)</option>
              </select>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={showCumulativeDebt}
                onChange={(e) => setShowCumulativeDebt(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand-jade)]"
              />
              <span className="min-w-0">
                <span className="block text-[14px] font-medium text-[var(--text-primary)]">
                  Hiện rõ Nợ cũ + Đơn này − Đã trả trên hóa đơn
                </span>
                <span className="block text-[12px] text-[var(--text-secondary)]">
                  Giúp khách dễ đối chiếu tổng nợ còn lại sau khi mua thêm hàng.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={showQrOnInvoice}
                onChange={(e) => setShowQrOnInvoice(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand-jade)]"
              />
              <span className="min-w-0">
                <span className="block text-[14px] font-medium text-[var(--text-primary)]">
                  Tự gắn mã VietQR chuyển khoản ở cuối hóa đơn
                </span>
                <span className="block text-[12px] text-[var(--text-secondary)]">
                  Khách chỉ cần mở app ngân hàng quét mã là chuyển đúng số tiền.
                </span>
              </span>
            </label>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="press-tactile flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-5 text-[16px] font-bold text-white hover:bg-[var(--brand-jade-hover)] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          <span>{saving ? 'Đang lưu cài đặt...' : 'Lưu tất cả cài đặt'}</span>
        </button>
      </form>

      {/* 6. Hướng dẫn & Tài khoản */}
      <section className="space-y-4 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] pb-4">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-[var(--text-primary)]">
              6. Hướng dẫn bắt đầu nhanh
            </p>
            <p className="text-[13px] text-[var(--text-secondary)]">
              Mở lại bảng hướng dẫn 3 bước (Tên tiệm, Ngân hàng QR, Món hàng đầu tiên).
            </p>
          </div>
          <button
            type="button"
            onClick={onReplayOnboarding}
            className="press-tactile flex min-h-[48px] shrink-0 items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] px-4 text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
          >
            <BookOpenCheck className="h-4 w-4 text-[var(--brand-jade-text)]" />
            <span>Xem lại hướng dẫn bắt đầu</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-[var(--text-primary)]">Tài khoản đăng nhập</p>
            <p className="text-[13px] text-[var(--text-secondary)]">
              Đăng xuất khỏi máy này (toàn bộ dữ liệu bán hàng và sổ nợ vẫn an toàn trên mạng).
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="press-tactile flex min-h-[48px] shrink-0 items-center gap-2 rounded-lg border border-[var(--status-overdue-border)] px-4 text-[14px] font-semibold text-[var(--status-overdue)] hover:bg-[var(--status-overdue-bg)]"
          >
            <LogOut className="h-4 w-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </section>
    </>
  );
}
