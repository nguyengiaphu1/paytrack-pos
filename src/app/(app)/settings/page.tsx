'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckCircle2, Loader2, LogOut, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getCurrentTimeHHMM_VN,
  getTodayVN,
  normalizeHHMM,
  shouldResetDigestSentDate,
} from '@/lib/vietnamese';
import { VIETNAM_BANKS } from '@/lib/vietqr';
import { usePosData } from '@/components/providers/PosDataProvider';
import { useAppUser } from '@/components/shell/AppShell';
import type { ShopProfile } from '@/types/database';
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
  const { userEmail, openOnboarding } = useAppUser();

  useEffect(() => {
    void ensureProfile();
  }, [ensureProfile]);

  const loading = !profileLoaded && !profileError;

  return (
    <div className="mx-auto max-w-[720px] px-3 py-4 sm:px-6 lg:py-5">
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--text-primary)] lg:text-[24px]">
          Cài đặt
        </h1>
      </div>

      <div className="space-y-4">
        {profileError && !profile ? (
          <FetchErrorCard
            title="Chưa tải được cài đặt"
            message={profileError}
            onRetry={() => void refreshProfile()}
          />
        ) : loading ? (
          <SettingsPageSkeleton />
        ) : (
          <SettingsFormBody
            profile={profile}
            userEmail={userEmail}
            openOnboarding={openOnboarding}
            setProfileLocal={setProfileLocal}
          />
        )}
      </div>
    </div>
  );
}

function SettingsFormBody({
  profile,
  userEmail,
  openOnboarding,
  setProfileLocal,
}: {
  profile: ShopProfile | null;
  userEmail: string;
  openOnboarding: () => void;
  setProfileLocal: (profile: ShopProfile) => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const syncedProfileIdRef = useRef<string | null>(profile?.id ?? null);
  const [shopName, setShopName] = useState(profile?.shop_name ?? 'Shop của Mẹ');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [bankBin, setBankBin] = useState(profile?.bank_bin ?? '');
  const [bankName, setBankName] = useState(profile?.bank_name ?? '');
  const [bankAccountNo, setBankAccountNo] = useState(profile?.bank_account_no ?? '');
  const [bankAccountName, setBankAccountName] = useState(profile?.bank_account_name ?? '');
  const [digestEnabled, setDigestEnabled] = useState(profile?.reminder_digest_enabled ?? true);
  const [digestHour, setDigestHour] = useState(
    normalizeHHMM(profile?.reminder_default_hour, '08:30')
  );

  useEffect(() => {
    if (!profile) return;
    if (syncedProfileIdRef.current === profile.id) return;
    syncedProfileIdRef.current = profile.id;
    setShopName(profile.shop_name ?? 'Shop của Mẹ');
    setPhone(profile.phone ?? '');
    setAddress(profile.address ?? '');
    setBankBin(profile.bank_bin ?? '');
    setBankName(profile.bank_name ?? '');
    setBankAccountNo(profile.bank_account_no ?? '');
    setBankAccountName(profile.bank_account_name ?? '');
    setDigestEnabled(profile.reminder_digest_enabled ?? true);
    setDigestHour(normalizeHHMM(profile.reminder_default_hour, '08:30'));
  }, [profile]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setErrorMsg(null);
    setSavedMsg(null);

    if (bankBin.trim() && !/^\d{6}$/.test(bankBin.trim())) {
      setErrorMsg('Chọn ngân hàng hợp lệ từ danh sách.');
      return;
    }

    const now = new Date();
    const normalizedHour = normalizeHHMM(digestHour, '08:30');
    const resetSentDate = shouldResetDigestSentDate({
      prevEnabled: profile?.reminder_digest_enabled ?? true,
      nextEnabled: digestEnabled,
      prevHour: profile?.reminder_default_hour,
      nextHour: normalizedHour,
      lastDigestSentDate: profile?.last_digest_sent_date,
      now,
    });
    const todayVN = getTodayVN(now);
    const nowHHMM = getCurrentTimeHHMM_VN(now);

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Phiên đăng nhập hết hạn');

      const upsertPayload: Record<string, unknown> = {
        user_id: user.id,
        shop_name: shopName.trim() || 'Shop của Mẹ',
        phone: phone.trim() || null,
        address: address.trim() || null,
        bank_bin: bankBin.trim() || null,
        bank_name: bankName.trim() || null,
        bank_account_no: bankAccountNo.replace(/\s+/g, '').trim() || null,
        bank_account_name: bankAccountName.trim().toUpperCase() || null,
        reminder_digest_enabled: digestEnabled,
        reminder_default_hour: normalizedHour,
      };

      if (resetSentDate) {
        upsertPayload.last_digest_sent_date = null;
      }

      const { data: savedRow, error } = await supabase
        .from('shop_profiles')
        .upsert(upsertPayload, { onConflict: 'user_id' })
        .select('*')
        .single();

      if (error) throw error;
      if (savedRow) {
        const typedRow = savedRow as ShopProfile;
        syncedProfileIdRef.current = typedRow.id;
        setProfileLocal(typedRow);
        setDigestHour(normalizeHHMM(typedRow.reminder_default_hour, '08:30'));
        window.dispatchEvent(new CustomEvent('paytrack:profile-saved'));
      }

      if (resetSentDate) {
        setSavedMsg(`Đã lưu — sẽ nhắc hôm nay lúc ${normalizedHour}.`);
      } else if (
        digestEnabled &&
        profile?.last_digest_sent_date === todayVN &&
        normalizedHour < nowHHMM
      ) {
        setSavedMsg(`Đã lưu — khung giờ ${normalizedHour} áp dụng từ ngày mai.`);
      } else {
        setSavedMsg('Đã lưu cài đặt.');
      }
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
    <div className="space-y-4">
      <form onSubmit={handleSave} className="space-y-4">
        {/* 1. Cửa hàng & VietQR */}
        <section
          id="bank"
          className="glass-panel space-y-4 rounded-[24px] p-4 sm:p-5"
        >
          <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
            Cửa hàng &amp; VietQR
          </h2>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="settings-shop-name"
                className="mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]"
              >
                Tên cửa hàng *
              </label>
              <input
                id="settings-shop-name"
                type="text"
                required
                value={shopName}
                onChange={(e) => {
                  setShopName(e.target.value);
                  setSavedMsg(null);
                }}
                className="glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label
                  htmlFor="settings-shop-phone"
                  className="mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]"
                >
                  Số điện thoại
                </label>
                <input
                  id="settings-shop-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setSavedMsg(null);
                  }}
                  placeholder="0901234567"
                  className="glass-input font-mono-tabular min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                />
              </div>
              <div className="min-w-0">
                <label
                  htmlFor="settings-shop-address"
                  className="mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]"
                >
                  Địa chỉ
                </label>
                <input
                  id="settings-shop-address"
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setSavedMsg(null);
                  }}
                  placeholder="Số nhà, đường..."
                  className="glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="glass-divider space-y-3 border-t pt-4">
            <div>
              <label
                htmlFor="settings-bank-bin"
                className="mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]"
              >
                Ngân hàng nhận QR
              </label>
              <select
                id="settings-bank-bin"
                value={bankBin}
                onChange={(e) => {
                  const selectedBin = e.target.value;
                  setBankBin(selectedBin);
                  const found = VIETNAM_BANKS.find((b) => b.bin === selectedBin);
                  if (found) setBankName(found.shortName);
                  setSavedMsg(null);
                }}
                className="glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
              >
                <option value="">-- Chọn ngân hàng --</option>
                {VIETNAM_BANKS.map((b) => (
                  <option key={b.bin} value={b.bin}>
                    {b.shortName} — {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label
                  htmlFor="settings-bank-account-no"
                  className="mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]"
                >
                  Số tài khoản
                </label>
                <input
                  id="settings-bank-account-no"
                  type="text"
                  inputMode="numeric"
                  value={bankAccountNo}
                  onChange={(e) => {
                    setBankAccountNo(e.target.value);
                    setSavedMsg(null);
                  }}
                  placeholder="0123456789"
                  className="glass-input font-mono-tabular min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                />
              </div>
              <div className="min-w-0">
                <label
                  htmlFor="settings-bank-account-name"
                  className="mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]"
                >
                  Chủ tài khoản
                </label>
                <input
                  id="settings-bank-account-name"
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => {
                    setBankAccountName(e.target.value);
                    setSavedMsg(null);
                  }}
                  placeholder="NGUYEN THI LAN"
                  className="glass-input min-h-[46px] w-full rounded-[14px] px-3.5 text-[16px] uppercase text-[var(--text-primary)] outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2. Nhắc nợ */}
        <section className="glass-panel space-y-3.5 rounded-[24px] p-4 sm:p-5">
          <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Nhắc nợ</h2>

          <PushNotificationSetup embedded />

          <div className="glass-divider border-t pt-3.5">
            <div className="glass-well flex flex-wrap items-center justify-between gap-3 rounded-[16px] px-3.5 py-2">
              <label className="flex min-h-[44px] min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={digestEnabled}
                  onChange={(e) => {
                    setDigestEnabled(e.target.checked);
                    setSavedMsg(null);
                  }}
                  className="h-4 w-4 shrink-0 accent-[var(--brand-jade)]"
                />
                <span className="text-[14px] font-medium text-[var(--text-primary)]">
                  Báo khách đến hạn mỗi ngày
                </span>
              </label>

              <input
                type="time"
                value={digestHour}
                onChange={(e) => {
                  setDigestHour(e.target.value);
                  setSavedMsg(null);
                }}
                aria-label="Giờ nhắc mỗi ngày"
                className="glass-input font-mono-tabular min-h-[44px] shrink-0 rounded-[14px] px-3 text-[16px] text-[var(--text-primary)] outline-none"
              />
            </div>
          </div>
        </section>

        {errorMsg && (
          <div
            role="alert"
            className="glass-badge-overdue animate-fade-in rounded-[16px] px-4 py-3 text-[14px] font-medium"
          >
            {errorMsg}
          </div>
        )}

        {savedMsg && (
          <div
            role="status"
            className="glass-badge-paid animate-fade-in flex items-center gap-2 rounded-[16px] px-4 py-3 text-[14px] font-semibold"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{savedMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="glass-btn-primary press-tactile flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full px-5 text-[16px] font-bold disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          <span>{saving ? 'Đang lưu...' : 'Lưu cài đặt'}</span>
        </button>
      </form>

      {/* 3. Giao diện */}
      <SettingsThemeSelector />

      {/* 4. Tài khoản */}
      <section className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-[26px] p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Tài khoản</h2>
          {userEmail && (
            <p className="mt-0.5 truncate text-[13px] text-[var(--text-secondary)]">
              {userEmail}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openOnboarding}
            className="glass-solid-control press-tactile flex min-h-[46px] shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold text-[var(--text-primary)]"
          >
            <BookOpen className="h-4 w-4 text-[var(--brand-jade-text)]" />
            <span>Thiết lập nhanh</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="glass-btn-danger press-tactile flex min-h-[46px] shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold"
          >
            <LogOut className="h-4 w-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </section>
    </div>
  );
}
