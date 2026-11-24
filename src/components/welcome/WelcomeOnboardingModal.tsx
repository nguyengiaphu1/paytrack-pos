'use client';

import { useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Landmark,
  Loader2,
  PackagePlus,
  Store,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatErrorMessageVN } from '@/lib/errors';
import { stripVietnamese } from '@/lib/vietnamese';
import { VIETNAM_BANKS } from '@/lib/vietqr';
import { writeOnboardingMirror } from '@/lib/welcome';
import type { Product, ShopProfile } from '@/types/database';
import { BrandMark } from '@/components/ui/BrandMark';
import { VndKInput } from '@/components/ui/VndKInput';
import { ModalDialog } from '@/components/ui/ModalDialog';

interface WelcomeOnboardingModalProps {
  open: boolean;
  userId: string;
  profile: ShopProfile | null;
  productsCount: number;
  onClose: () => void;
  setProfileLocal: (profile: ShopProfile) => void;
  upsertProductLocal: (product: Product) => void;
}

const DEFAULT_SHOP_NAMES = new Set(['shop của mẹ', 'tạp hóa mẹ', '']);

export function WelcomeOnboardingModal({
  open,
  userId,
  profile,
  productsCount,
  onClose,
  setProfileLocal,
  upsertProductLocal,
}: WelcomeOnboardingModalProps) {
  const normalizedProfileShop = (profile?.shop_name ?? '').trim().toLowerCase();
  const hasRealShopProfile =
    Boolean(profile?.phone?.trim()) ||
    (Boolean(normalizedProfileShop) && !DEFAULT_SHOP_NAMES.has(normalizedProfileShop));
  const initialBankDone = Boolean(profile?.bank_bin && profile?.bank_account_no);

  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(() =>
    !hasRealShopProfile ? 1 : !initialBankDone ? 2 : 3
  );

  const [shopName, setShopName] = useState(profile?.shop_name ?? 'Shop của Mẹ');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [savingShop, setSavingShop] = useState(false);
  const [shopSaved, setShopSaved] = useState(false);

  const [bankBin, setBankBin] = useState(profile?.bank_bin ?? '');
  const [bankName, setBankName] = useState(profile?.bank_name ?? '');
  const [bankAccountNo, setBankAccountNo] = useState(profile?.bank_account_no ?? '');
  const [bankAccountName, setBankAccountName] = useState(profile?.bank_account_name ?? '');
  const [savingBank, setSavingBank] = useState(false);
  const [bankSaved, setBankSaved] = useState(false);

  const [prodName, setProdName] = useState('');
  const [prodPriceVnd, setProdPriceVnd] = useState<number | null>(null);
  const [prodUnit, setProdUnit] = useState('cái');
  const [savingProd, setSavingProd] = useState(false);
  const [prodSavedCount, setProdSavedCount] = useState(0);
  const [lastAddedProdName, setLastAddedProdName] = useState<string | null>(null);

  const [finishing, setFinishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const step1Done = shopSaved || hasRealShopProfile;
  const step2Done = bankSaved || initialBankDone;
  const step3Done = prodSavedCount > 0 || productsCount > 0;
  const completedSteps = [step1Done, step2Done, step3Done].filter(Boolean).length;

  const shopDirty =
    shopName.trim() !== (profile?.shop_name ?? 'Shop của Mẹ').trim() ||
    phone.trim() !== (profile?.phone ?? '').trim();

  const bankDirty =
    Boolean(bankBin && bankAccountNo.trim()) &&
    (bankBin !== (profile?.bank_bin ?? '') ||
      bankAccountNo.replace(/\s+/g, '').trim() !== (profile?.bank_account_no ?? '') ||
      bankAccountName.trim().toUpperCase() !== (profile?.bank_account_name ?? ''));

  const prodDirty = Boolean(prodName.trim() && prodPriceVnd !== null && prodPriceVnd >= 0);

  async function markOnboardingSeenAndClose() {
    if (finishing) return;
    setFinishing(true);
    writeOnboardingMirror(userId, true);
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: { welcome_v2_seen: true },
      });
    } catch {
      // Keep local mirror even on weak connection
    } finally {
      setFinishing(false);
      onClose();
    }
  }

  async function saveDirtyAndStart() {
    if (finishing) return;
    setErrorMsg(null);
    setFinishing(true);
    try {
      const supabase = createClient();
      if (shopDirty || bankDirty) {
        const payload: Record<string, string | null> = {
          user_id: userId,
          shop_name: shopName.trim() || profile?.shop_name || 'Shop của Mẹ',
          phone: phone.trim() || null,
        };
        if (bankBin && bankAccountNo.trim()) {
          payload.bank_bin = bankBin.trim();
          payload.bank_name = bankName.trim() || null;
          payload.bank_account_no = bankAccountNo.replace(/\s+/g, '').trim();
          payload.bank_account_name = bankAccountName.trim().toUpperCase() || null;
        }
        const { data, error } = await supabase
          .from('shop_profiles')
          .upsert(payload, { onConflict: 'user_id' })
          .select('*')
          .single();
        if (error) throw error;
        if (data) setProfileLocal(data as ShopProfile);
      }

      if (prodDirty && prodPriceVnd !== null) {
        const cleanName = prodName.trim();
        const { data, error } = await supabase
          .from('products')
          .insert({
            user_id: userId,
            name: cleanName,
            search_text: stripVietnamese(cleanName),
            unit: prodUnit.trim() || 'cái',
            price: Math.round(prodPriceVnd),
            is_active: true,
          })
          .select('*')
          .single();
        if (error) throw error;
        if (data) upsertProductLocal(data as Product);
      }

      writeOnboardingMirror(userId, true);
      try {
        await supabase.auth.updateUser({ data: { welcome_v2_seen: true } });
      } catch {
        // Keep local mirror even on weak connection
      }
      onClose();
    } catch (err) {
      setErrorMsg(formatErrorMessageVN(err, 'Chưa lưu được thiết lập, vui lòng thử lại.'));
    } finally {
      setFinishing(false);
    }
  }

  async function handleSaveShop(e: FormEvent) {
    e.preventDefault();
    if (savingShop) return;
    setErrorMsg(null);
    setSavingShop(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('shop_profiles')
        .upsert(
          {
            user_id: userId,
            shop_name: shopName.trim() || 'Shop của Mẹ',
            phone: phone.trim() || null,
          },
          { onConflict: 'user_id' }
        )
        .select('*')
        .single();
      if (error) throw error;
      if (data) setProfileLocal(data as ShopProfile);
      setShopSaved(true);
      if (!step2Done) setActiveStep(2);
    } catch (err) {
      setErrorMsg(formatErrorMessageVN(err, 'Chưa lưu được thông tin shop.'));
    } finally {
      setSavingShop(false);
    }
  }

  async function handleSaveBank(e: FormEvent) {
    e.preventDefault();
    if (savingBank) return;
    setErrorMsg(null);
    if (!bankBin || !bankAccountNo.trim()) {
      setErrorMsg('Chọn ngân hàng và nhập số tài khoản.');
      return;
    }
    setSavingBank(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('shop_profiles')
        .upsert(
          {
            user_id: userId,
            shop_name: profile?.shop_name || shopName.trim() || 'Shop của Mẹ',
            bank_bin: bankBin.trim(),
            bank_name: bankName.trim() || null,
            bank_account_no: bankAccountNo.replace(/\s+/g, '').trim(),
            bank_account_name: bankAccountName.trim().toUpperCase() || null,
          },
          { onConflict: 'user_id' }
        )
        .select('*')
        .single();
      if (error) throw error;
      if (data) setProfileLocal(data as ShopProfile);
      setBankSaved(true);
      if (!step3Done) setActiveStep(3);
    } catch (err) {
      setErrorMsg(formatErrorMessageVN(err, 'Chưa lưu được tài khoản ngân hàng.'));
    } finally {
      setSavingBank(false);
    }
  }

  async function handleAddFirstProduct(e: FormEvent) {
    e.preventDefault();
    if (savingProd) return;
    setErrorMsg(null);
    const cleanName = prodName.trim();
    if (!cleanName || prodPriceVnd === null || prodPriceVnd < 0) {
      setErrorMsg('Nhập tên món và giá bán hợp lệ.');
      return;
    }
    setSavingProd(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('products')
        .insert({
          user_id: userId,
          name: cleanName,
          search_text: stripVietnamese(cleanName),
          unit: prodUnit.trim() || 'cái',
          price: Math.round(prodPriceVnd),
          is_active: true,
        })
        .select('*')
        .single();
      if (error) throw error;
      if (data) upsertProductLocal(data as Product);
      setProdName('');
      setProdPriceVnd(null);
      setProdSavedCount((c) => c + 1);
      setLastAddedProdName(cleanName);
    } catch (err) {
      setErrorMsg(formatErrorMessageVN(err, 'Chưa thêm được món hàng.'));
    } finally {
      setSavingProd(false);
    }
  }

  const hasUnsavedInputs = shopDirty || bankDirty || prodDirty;

  return (
    <ModalDialog
      open={open}
      onClose={() => void markOnboardingSeenAndClose()}
      closeOnBackdrop={!finishing}
      closeOnEscape={!finishing}
      ariaLabelledBy="welcome-onboarding-title"
      backdropClassName="animate-backdrop-in glass-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      panelClassName="glass-modal animate-sheet-up sm:animate-modal-in flex max-h-[92dvh] w-full max-w-[540px] flex-col overflow-hidden rounded-t-[26px] sm:rounded-[26px]"
    >
      {/* Header */}
      <div className="glass-modal-header flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="glass-icon-orb flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] p-1.5">
            <BrandMark className="h-8 w-8 shrink-0" />
          </div>
          <div className="min-w-0">
            <h2
              id="welcome-onboarding-title"
              className="truncate text-[16px] font-bold text-[var(--text-primary)]"
            >
              Thiết lập nhanh shop
            </h2>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Hoàn thành {completedSteps}/3 bước — có thể bỏ qua và sửa sau
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={finishing}
          onClick={markOnboardingSeenAndClose}
          aria-label="Đóng"
          className="glass-btn-secondary press-tactile flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body: Calm 3-Step Progressive Checklist */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
        {errorMsg && (
          <div
            role="alert"
            className="glass-badge-overdue rounded-[16px] px-3.5 py-2.5 text-[14px] font-medium"
          >
            {errorMsg}
          </div>
        )}

        {/* Step 1: Shop Info */}
        <div
          className={`rounded-[20px] transition-all ${
            activeStep === 1 ? 'glass-card' : 'glass-well'
          }`}
        >
          <button
            type="button"
            aria-expanded={activeStep === 1}
            onClick={() => setActiveStep(1)}
            className="flex min-h-[54px] w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={`font-mono-tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  step1Done ? 'glass-badge-paid' : 'glass-badge-neutral'
                }`}
              >
                {step1Done ? <CheckCircle2 className="h-4 w-4" /> : '1'}
              </span>
              <Store className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
              <span className="truncate text-[14px] font-bold text-[var(--text-primary)]">
                Tên shop & SĐT liên hệ
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {step1Done && (
                <span className="glass-badge-paid rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                  Đã lưu
                </span>
              )}
              {activeStep === 1 ? (
                <ChevronUp className="h-4 w-4 text-[var(--text-secondary)]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
              )}
            </div>
          </button>

          {activeStep === 1 && (
            <form
              onSubmit={handleSaveShop}
              className="glass-divider space-y-3 border-t px-3.5 py-3.5"
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="welcome-shop-name"
                    className="mb-1.5 block text-[12px] font-medium text-[var(--text-secondary)]"
                  >
                    Tên shop
                  </label>
                  <input
                    id="welcome-shop-name"
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="VD: Shop Mẹ Lan"
                    className="glass-input min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="welcome-shop-phone"
                    className="mb-1.5 block text-[12px] font-medium text-[var(--text-secondary)]"
                  >
                    SĐT / Zalo
                  </label>
                  <input
                    id="welcome-shop-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0901234567"
                    className="glass-input font-mono-tabular min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="glass-btn-secondary press-tactile min-h-[44px] rounded-full px-3.5 text-[13px] font-semibold text-[var(--text-secondary)]"
                >
                  Qua bước 2
                </button>
                <button
                  type="submit"
                  disabled={savingShop}
                  className="glass-btn-primary press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold disabled:opacity-60"
                >
                  {savingShop && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{shopSaved ? 'Đã lưu' : 'Lưu & tiếp tục'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Step 2: Bank Account */}
        <div
          className={`rounded-[20px] transition-all ${
            activeStep === 2 ? 'glass-card' : 'glass-well'
          }`}
        >
          <button
            type="button"
            aria-expanded={activeStep === 2}
            onClick={() => setActiveStep(2)}
            className="flex min-h-[54px] w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={`font-mono-tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  step2Done ? 'glass-badge-paid' : 'glass-badge-neutral'
                }`}
              >
                {step2Done ? <CheckCircle2 className="h-4 w-4" /> : '2'}
              </span>
              <Landmark className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
              <span className="truncate text-[14px] font-bold text-[var(--text-primary)]">
                Ngân hàng VietQR gửi khách
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {step2Done && (
                <span className="glass-badge-paid rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                  Đã có
                </span>
              )}
              {activeStep === 2 ? (
                <ChevronUp className="h-4 w-4 text-[var(--text-secondary)]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
              )}
            </div>
          </button>

          {activeStep === 2 && (
            <form
              onSubmit={handleSaveBank}
              className="glass-divider space-y-3 border-t px-3.5 py-3.5"
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="welcome-bank-bin"
                    className="mb-1.5 block text-[12px] font-medium text-[var(--text-secondary)]"
                  >
                    Ngân hàng
                  </label>
                  <select
                    id="welcome-bank-bin"
                    value={bankBin}
                    onChange={(e) => {
                      const nextBin = e.target.value;
                      setBankBin(nextBin);
                      const found = VIETNAM_BANKS.find((b) => b.bin === nextBin);
                      if (found) setBankName(found.shortName);
                    }}
                    className="glass-input min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                  >
                    <option value="">-- Chọn ngân hàng --</option>
                    {VIETNAM_BANKS.map((bank) => (
                      <option key={bank.bin} value={bank.bin}>
                        {bank.shortName} — {bank.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="welcome-bank-acc"
                    className="mb-1.5 block text-[12px] font-medium text-[var(--text-secondary)]"
                  >
                    Số tài khoản
                  </label>
                  <input
                    id="welcome-bank-acc"
                    type="text"
                    inputMode="numeric"
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value)}
                    placeholder="VD: 1903..."
                    className="glass-input font-mono-tabular min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="welcome-bank-holder"
                  className="mb-1.5 block text-[12px] font-medium text-[var(--text-secondary)]"
                >
                  Tên chủ tài khoản (không dấu)
                </label>
                <input
                  id="welcome-bank-holder"
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="NGUYEN THI LAN"
                  className="glass-input min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] uppercase text-[var(--text-primary)] outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="glass-btn-secondary press-tactile min-h-[44px] rounded-full px-3.5 text-[13px] font-semibold text-[var(--text-secondary)]"
                >
                  Qua bước 3
                </button>
                <button
                  type="submit"
                  disabled={savingBank}
                  className="glass-btn-primary press-tactile inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold disabled:opacity-60"
                >
                  {savingBank && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{bankSaved ? 'Đã lưu' : 'Lưu & tiếp tục'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Step 3: First Product */}
        <div
          className={`rounded-[20px] transition-all ${
            activeStep === 3 ? 'glass-card' : 'glass-well'
          }`}
        >
          <button
            type="button"
            aria-expanded={activeStep === 3}
            onClick={() => setActiveStep(3)}
            className="flex min-h-[54px] w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={`font-mono-tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  step3Done ? 'glass-badge-paid' : 'glass-badge-neutral'
                }`}
              >
                {step3Done ? <CheckCircle2 className="h-4 w-4" /> : '3'}
              </span>
              <PackagePlus className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
              <span className="truncate text-[14px] font-bold text-[var(--text-primary)]">
                Món hàng đầu tiên
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {step3Done && (
                <span className="glass-badge-paid rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
                  {Math.max(productsCount, prodSavedCount)} món
                </span>
              )}
              {activeStep === 3 ? (
                <ChevronUp className="h-4 w-4 text-[var(--text-secondary)]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
              )}
            </div>
          </button>

          {activeStep === 3 && (
            <form
              onSubmit={handleAddFirstProduct}
              className="glass-divider space-y-3 border-t px-3.5 py-3.5"
            >
              {lastAddedProdName && (
                <p
                  role="status"
                  aria-live="polite"
                  className="glass-badge-paid rounded-[14px] px-3 py-2 text-[13px] font-semibold"
                >
                  Đã thêm &ldquo;{lastAddedProdName}&rdquo; vào danh sách.
                </p>
              )}
              <div>
                <label
                  htmlFor="welcome-prod-name"
                  className="mb-1.5 block text-[12px] font-medium text-[var(--text-secondary)]"
                >
                  Tên món hàng
                </label>
                <input
                  id="welcome-prod-name"
                  type="text"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="VD: Mật ong rừng 500ml"
                  className="glass-input min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                />
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="welcome-prod-price"
                    className="mb-1.5 block text-[12px] font-medium text-[var(--text-secondary)]"
                  >
                    Giá bán (nghìn)
                  </label>
                  <VndKInput
                    id="welcome-prod-price"
                    compact
                    valueVnd={prodPriceVnd}
                    onChangeVnd={setProdPriceVnd}
                    placeholder="150"
                  />
                </div>
                <div>
                  <label
                    htmlFor="welcome-prod-unit"
                    className="mb-1.5 block text-[12px] font-medium text-[var(--text-secondary)]"
                  >
                    Đơn vị
                  </label>
                  <input
                    id="welcome-prod-unit"
                    type="text"
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    placeholder="cái / hộp / chai"
                    className="glass-input min-h-[44px] w-full rounded-[14px] px-3.5 text-[16px] text-[var(--text-primary)] outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingProd}
                  className="glass-btn-secondary press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-[var(--brand-jade-text)] disabled:opacity-60"
                >
                  {savingProd && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Thêm món vào danh sách</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="glass-modal-footer flex flex-wrap items-center justify-between gap-2.5 px-4 py-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] sm:px-5 sm:pb-3.5">
        <button
          type="button"
          disabled={finishing}
          onClick={markOnboardingSeenAndClose}
          className="glass-btn-secondary press-tactile min-h-[48px] flex-1 rounded-full px-4 text-[14px] font-semibold text-[var(--text-secondary)] disabled:opacity-60 sm:flex-none"
        >
          Để sau
        </button>
        <button
          type="button"
          disabled={finishing}
          onClick={() => void saveDirtyAndStart()}
          className="glass-btn-primary press-tactile inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold disabled:opacity-60 sm:flex-none"
        >
          {finishing && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{hasUnsavedInputs ? 'Lưu & bắt đầu' : 'Bắt đầu lên đơn'}</span>
        </button>
      </div>
    </ModalDialog>
  );
}
