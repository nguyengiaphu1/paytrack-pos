'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  BookOpenCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  QrCode,
  ShoppingBag,
  Store,
  Users,
} from 'lucide-react';
import { ThemeQuickToggle } from '@/components/ui/ThemeToggle';

type AuthMode = 'login' | 'signup' | 'forgot';

const WELCOME_HIGHLIGHTS = [
  {
    icon: ShoppingBag,
    title: 'Tính tiền nhanh trong 3 chạm',
    desc: 'Chạm món là ra hóa đơn rõ ràng, không cần cộng tay dễ nhầm.',
  },
  {
    icon: Users,
    title: 'Sổ nợ khách quen tự động nhớ',
    desc: 'Khách trả góp hay ghi nợ đều tự trừ đơn cũ nhất và nhắc đúng hạn.',
  },
  {
    icon: QrCode,
    title: 'Mã VietQR đúng từng đồng',
    desc: 'Khách quét là điền sẵn số tiền và nội dung, gửi ảnh hóa đơn qua Zalo.',
  },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleGoogleLogin() {
    if (googleLoading || loading) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      if (error) {
        setErrorMessage(error.message);
        setGoogleLoading(false);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Không thể kết nối Google');
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading || googleLoading) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const supabase = createClient();

      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setErrorMessage('Email hoặc mật khẩu chưa đúng. Vui lòng kiểm tra lại.');
          return;
        }
        router.push('/');
        router.refresh();
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              shop_name: shopName.trim() || 'Tạp Hóa Mẹ',
            },
          },
        });
        if (error) {
          setErrorMessage(error.message);
          return;
        }
        if (data.session) {
          router.push('/');
          router.refresh();
        } else {
          setSuccessMessage(
            'Đã tạo sổ mới! Vui lòng mở hộp thư email và bấm vào liên kết xác nhận để đăng nhập.'
          );
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
        });
        if (error) {
          setErrorMessage(error.message);
          return;
        }
        setSuccessMessage('Đã gửi liên kết đặt lại mật khẩu vào hộp thư email của bạn.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[var(--bg-canvas)] px-4 py-6 sm:py-10">
      {/* Top Bar with Theme Quick Toggle */}
      <div className="mx-auto mb-6 flex max-w-[960px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-jade)] text-white">
            <BookOpenCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-bold tracking-[-0.015em] text-[var(--text-primary)] sm:text-[22px]">
              PayTrack POS
            </h1>
            <p className="truncate text-[13px] text-[var(--text-secondary)]">
              Sổ bán hàng &amp; công nợ cho cửa hàng
            </p>
          </div>
        </div>
        <ThemeQuickToggle compact />
      </div>

      <div className="mx-auto grid max-w-[960px] items-start gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        {/* Layer 1 Welcome Intro (Compact strip on mobile, full card on desktop) */}
        <section
          aria-label="Giới thiệu PayTrack POS"
          className="animate-fade-in rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--status-paid-bg)] px-3 py-1 text-[12px] font-semibold text-[var(--status-paid)]">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>Dùng chung trên iPhone &amp; máy tính Windows</span>
          </div>

          <h2 className="mt-3 text-[20px] font-bold leading-snug tracking-[-0.015em] text-[var(--text-primary)] sm:text-[24px]">
            Chào mừng đến với sổ bán hàng dễ dùng mỗi ngày
          </h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--text-secondary)]">
            Mở sổ là bán được ngay — mọi đơn hàng và tiền nợ của khách quen đều lưu an toàn, không lo mất khi tắt máy.
          </p>

          <ul className="mt-4 space-y-3">
            {WELCOME_HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.title}
                  className="flex items-start gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] p-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--status-paid-bg)] text-[var(--brand-jade-text)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[var(--text-primary)]">{item.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                      {item.desc}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Auth Card */}
        <section className="animate-fade-in rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6">
          {/* Clear Mode Switcher */}
          {mode !== 'forgot' && (
            <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-lg bg-[var(--bg-subtle)] p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`min-h-[44px] rounded-md px-3 text-[14px] font-semibold transition-colors ${
                  mode === 'login'
                    ? 'border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--brand-jade-text)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`min-h-[44px] rounded-md px-3 text-[14px] font-semibold transition-colors ${
                  mode === 'signup'
                    ? 'border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--brand-jade-text)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Mở sổ bán hàng mới
              </button>
            </div>
          )}

          <h2 className="mb-1 text-[18px] font-bold text-[var(--text-primary)]">
            {mode === 'login' && 'Đăng nhập vào tiệm của bạn'}
            {mode === 'signup' && 'Tạo sổ bán hàng mới'}
            {mode === 'forgot' && 'Lấy lại mật khẩu'}
          </h2>
          <p className="mb-5 text-[14px] text-[var(--text-secondary)]">
            {mode === 'login' && 'Nhập email và mật khẩu để mở sổ đơn hàng & công nợ.'}
            {mode === 'signup' && 'Điền tên tiệm, email và mật khẩu bất kỳ (từ 6 ký tự) để bắt đầu.'}
            {mode === 'forgot' && 'Nhập email đã đăng ký để nhận đường dẫn đặt lại mật khẩu mới.'}
          </p>

          {errorMessage && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] px-3.5 py-2.5 text-[14px] font-medium text-[var(--status-overdue)]"
            >
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mb-4 rounded-lg border border-[var(--brand-jade)] bg-[var(--status-paid-bg)] px-3.5 py-2.5 text-[14px] font-medium text-[var(--status-paid)]"
            >
              {successMessage}
            </div>
          )}

          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="press-tactile flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 text-[15px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] disabled:opacity-60"
              >
                {googleLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-jade-text)]" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                )}
                <span>Đăng nhập nhanh bằng Google</span>
              </button>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--border-default)]" />
                <span className="text-[13px] text-[var(--text-secondary)]">hoặc nhập Email</span>
                <div className="h-px flex-1 bg-[var(--border-default)]" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="shop-name"
                  className="mb-1.5 block text-[14px] font-medium text-[var(--text-primary)]"
                >
                  Tên cửa hàng của bạn
                </label>
                <div className="relative">
                  <Store className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    id="shop-name"
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="VD: Tạp Hóa Cô Lan"
                    className="min-h-[48px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] pr-3.5 pl-10 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="mb-1.5 block text-[14px] font-medium text-[var(--text-primary)]"
              >
                Địa chỉ Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tenban@gmail.com"
                  className="min-h-[48px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] pr-3.5 pl-10 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label
                    htmlFor="auth-password"
                    className="block text-[14px] font-medium text-[var(--text-primary)]"
                  >
                    Mật khẩu
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[13px] font-medium text-[var(--brand-jade-text)] hover:underline"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập từ 6 ký tự trở lên"
                    className="min-h-[48px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] pr-12 pl-10 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="press-tactile flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-4 text-[16px] font-semibold text-white transition-colors hover:bg-[var(--brand-jade-hover)] disabled:opacity-60"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              <span>
                {mode === 'login' && (loading ? 'Đang đăng nhập...' : 'Đăng nhập ngay')}
                {mode === 'signup' && (loading ? 'Đang tạo sổ...' : 'Tạo sổ bán hàng')}
                {mode === 'forgot' && (loading ? 'Đang gửi email...' : 'Gửi hướng dẫn đặt lại')}
              </span>
            </button>
          </form>

          {mode === 'forgot' && (
            <div className="mt-5 border-t border-[var(--border-default)] pt-4 text-center text-[14px] text-[var(--text-secondary)]">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="font-semibold text-[var(--brand-jade-text)] hover:underline"
              >
                Quay lại trang đăng nhập
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
