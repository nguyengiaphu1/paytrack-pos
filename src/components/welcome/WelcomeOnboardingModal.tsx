'use client';

import { useState, type FormEvent } from 'react';
import {
  BookOpenCheck,
  CheckCircle2,
  Landmark,
  Loader2,
  PackagePlus,
  Store,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { stripVietnamese } from '@/lib/vietnamese';
import { VIETNAM_BANKS } from '@/lib/vietqr';
import { writeOnboardingMirror } from '@/lib/welcome';
import type { Product, ShopProfile } from '@/types/database';

interface WelcomeOnboardingModalProps {
  open: boolean;
  userId: string;
  profile: ShopProfile | null;
  productsCount: number;
  onClose: () => void;
  setProfileLocal: (profile: ShopProfile) => void;
  upsertProductLocal: (product: Product) => void;
}

export function WelcomeOnboardingModal({
  open,
  userId,
  profile,
  productsCount,
  onClose,
  setProfileLocal,
  upsertProductLocal,
}: WelcomeOnboardingModalProps) {
  const [shopName, setShopName] = useState(profile?.shop_name ?? 'Tạp Hóa Mẹ');
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
  const [prodPrice, setProdPrice] = useState('');
  const [prodUnit, setProdUnit] = useState('cái');
  const [savingProd, setSavingProd] = useState(false);
  const [prodSavedCount, setProdSavedCount] = useState(0);

  const [finishing, setFinishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const step1Done = shopSaved || Boolean(profile?.shop_name?.trim());
  const step2Done =
    bankSaved || Boolean(profile?.bank_bin && profile?.bank_account_no);
  const step3Done = prodSavedCount > 0 || productsCount > 0;

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
      // Giữ trạng thái local mirror ngay cả khi mạng yếu
    } finally {
      setFinishing(false);
      onClose();
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
            shop_name: shopName.trim() || 'Tạp Hóa Mẹ',
            phone: phone.trim() || null,
          },
          { onConflict: 'user_id' }
        )
        .select('*')
        .single();
      if (error) throw error;
      if (data) setProfileLocal(data as ShopProfile);
      setShopSaved(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Chưa lưu được tên tiệm.');
    } finally {
      setSavingShop(false);
    }
  }

  async function handleSaveBank(e: FormEvent) {
    e.preventDefault();
    if (savingBank) return;
    setErrorMsg(null);
    if (!bankBin || !bankAccountNo.trim()) {
      setErrorMsg('Chọn ngân hàng và nhập số tài khoản để tạo mã QR.');
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
            shop_name: profile?.shop_name || shopName.trim() || 'Tạp Hóa Mẹ',
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
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Chưa lưu được tài khoản ngân hàng.');
    } finally {
      setSavingBank(false);
    }
  }

  async function handleAddFirstProduct(e: FormEvent) {
    e.preventDefault();
    if (savingProd) return;
    setErrorMsg(null);
    const cleanName = prodName.trim();
    const numericPrice = Math.round(Number(prodPrice));
    if (!cleanName || !Number.isFinite(numericPrice) || numericPrice < 0) {
      setErrorMsg('Nhập tên món và giá bán hợp lệ (VD: 15000).');
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
          price: numericPrice,
          is_active: true,
        })
        .select('*')
        .single();
      if (error) throw error;
      if (data) upsertProductLocal(data as Product);
      setProdName('');
      setProdPrice('');
      setProdSavedCount((c) => c + 1);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Chưa thêm được món hàng.');
    } finally {
      setSavingProd(false);
    }
  }

  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Chào mừng đến với PayTrack POS"
    >
      <div className="animate-sheet-up sm:animate-modal-in flex max-h-[92dvh] w-full max-w-[600px] flex-col overflow-hidden rounded-t-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] sm:rounded-[10px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-default)] px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-jade)] text-white">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[18px] font-bold text-[var(--text-primary)]">
                Chào mừng bạn đến với PayTrack POS!
              </h2>
              <p className="text-[13px] text-[var(--text-secondary)]">
                3 bước nhanh để sẵn sàng bán hàng, ghi sổ nợ và tạo mã QR chuyển khoản.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={finishing}
            onClick={markOnboardingSeenAndClose}
            aria-label="Đóng hướng dẫn"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {errorMsg && (
            <div
              role="alert"
              className="rounded-lg border border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] px-3.5 py-2.5 text-[14px] font-medium text-[var(--status-overdue)]"
            >
              {errorMsg}
            </div>
          )}

          {/* Step 1: Shop Name */}
          <form
            onSubmit={handleSaveShop}
            className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-3.5 sm:p-4"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
                <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                  Bước 1: Tên cửa hàng &amp; số điện thoại
                </h3>
              </div>
              {step1Done && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--status-paid-bg)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--status-paid)]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Đã có
                </span>
              )}
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="VD: Tạp Hóa Cô Lan"
                aria-label="Tên cửa hàng"
                className="min-h-[44px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="SĐT in lên hóa đơn (nếu có)"
                aria-label="Số điện thoại cửa hàng"
                className="min-h-[44px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              />
            </div>
            <div className="mt-2.5 flex justify-end">
              <button
                type="submit"
                disabled={savingShop}
                className="press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-60"
              >
                {savingShop && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{shopSaved ? 'Đã lưu tên tiệm' : 'Lưu tên tiệm'}</span>
              </button>
            </div>
          </form>

          {/* Step 2: Bank Account for VietQR */}
          <form
            onSubmit={handleSaveBank}
            className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-3.5 sm:p-4"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
                <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                  Bước 2: Tài khoản nhận mã VietQR (tùy chọn)
                </h3>
              </div>
              {step2Done && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--status-paid-bg)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--status-paid)]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Đã có
                </span>
              )}
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <select
                value={bankBin}
                onChange={(e) => {
                  const nextBin = e.target.value;
                  setBankBin(nextBin);
                  const found = VIETNAM_BANKS.find((b) => b.bin === nextBin);
                  if (found) setBankName(found.shortName);
                }}
                aria-label="Chọn ngân hàng"
                className="min-h-[44px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              >
                <option value="">-- Chọn ngân hàng --</option>
                {VIETNAM_BANKS.map((bank) => (
                  <option key={bank.bin} value={bank.bin}>
                    {bank.shortName} — {bank.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                inputMode="numeric"
                value={bankAccountNo}
                onChange={(e) => setBankAccountNo(e.target.value)}
                placeholder="Số tài khoản nhận tiền"
                aria-label="Số tài khoản ngân hàng"
                className="font-mono-tabular min-h-[44px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <input
                type="text"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="Tên chủ tài khoản (VD: NGUYEN THI LAN)"
                aria-label="Tên chủ tài khoản"
                className="min-h-[44px] flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[16px] uppercase text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              />
              <button
                type="submit"
                disabled={savingBank}
                className="press-tactile inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-60"
              >
                {savingBank && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{bankSaved ? 'Đã lưu ngân hàng' : 'Lưu ngân hàng'}</span>
              </button>
            </div>
          </form>

          {/* Step 3: Add First Product */}
          <form
            onSubmit={handleAddFirstProduct}
            className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-3.5 sm:p-4"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PackagePlus className="h-4 w-4 shrink-0 text-[var(--brand-jade-text)]" />
                <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                  Bước 3: Thêm nhanh 1 món hàng (tùy chọn)
                </h3>
              </div>
              {step3Done && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--status-paid-bg)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--status-paid)]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Đã có {productsCount + prodSavedCount > 0 ? `${productsCount} món` : ''}
                </span>
              )}
            </div>
            <div className="grid gap-2.5 sm:grid-cols-[1.4fr_1fr_0.7fr]">
              <input
                type="text"
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="Tên món (VD: Nước suối)"
                aria-label="Tên món hàng đầu tiên"
                className="min-h-[44px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              />
              <input
                type="number"
                min={0}
                step={500}
                value={prodPrice}
                onChange={(e) => setProdPrice(e.target.value)}
                placeholder="Giá bán (VD: 10000)"
                aria-label="Giá bán"
                className="font-mono-tabular min-h-[44px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              />
              <input
                type="text"
                value={prodUnit}
                onChange={(e) => setProdUnit(e.target.value)}
                placeholder="Đơn vị"
                aria-label="Đơn vị tính"
                className="min-h-[44px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
              />
            </div>
            <div className="mt-2.5 flex justify-end">
              <button
                type="submit"
                disabled={savingProd}
                className="press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-60"
              >
                {savingProd && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Thêm món vào sổ</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3.5 sm:px-5">
          <button
            type="button"
            disabled={finishing}
            onClick={markOnboardingSeenAndClose}
            className="press-tactile min-h-[48px] flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 text-[14px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] disabled:opacity-60 sm:flex-none"
          >
            Bỏ qua, vào bán hàng ngay
          </button>
          <button
            type="button"
            disabled={finishing}
            onClick={markOnboardingSeenAndClose}
            className="press-tactile inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-5 text-[15px] font-semibold text-white hover:bg-[var(--brand-jade-hover)] disabled:opacity-60 sm:flex-none"
          >
            {finishing && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Hoàn tất &amp; Bắt đầu bán</span>
          </button>
        </div>
      </div>
    </div>
  );
}
