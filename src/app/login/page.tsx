'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Loader2, Lock, Mail, Store } from 'lucide-react';
import { BrandMark } from '@/components/ui/BrandMark';
import { ThemeQuickToggle } from '@/components/ui/ThemeToggle';

type AuthMode = 'login' | 'signup' | 'forgot';

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
          setErrorMessage('Email hoặc mật khẩu chưa đúng.');
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
              shop_name: shopName.trim() || 'Shop của Mẹ',
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
          setSuccessMessage('Kiểm tra hộp thư email để xác nhận đăng ký.');
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
        });
        if (error) {
          setErrorMessage(error.message);
          return;
        }
        setSuccessMessage('Đã gửi liên kết đặt lại mật khẩu vào email.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Có lỗi xảy ra, thử lại sau.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col px-4 py-5 sm:px-6 sm:py-8">
      {/* Floating glass theme switch in top-right corner */}
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-end">
        <ThemeQuickToggle compact />
      </div>

      <div className="mx-auto my-auto w-full max-w-[440px] py-6 sm:py-8">
        <section className="animate-fade-in glass-panel rounded-[28px] p-5 sm:p-7">
          {/* Luminous BrandMark Orb & Hero Title */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="glass-icon-orb mb-3.5 flex h-16 w-16 items-center justify-center rounded-[20px] p-2.5">
              <BrandMark className="h-11 w-11 shrink-0" />
            </div>
            <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--text-primary)] sm:text-[24px]">
              PayTrack POS
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-[var(--text-secondary)]">
              Sổ bán hàng &amp; Công nợ
            </p>
          </div>

          {mode !== 'forgot' && (
            <div className="glass-well mb-5 grid grid-cols-2 gap-1.5 rounded-full p-1.5">
              <button
                type="button"
                aria-pressed={mode === 'login'}
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`press-tactile min-h-[44px] rounded-full px-3 text-[14px] font-semibold transition-all ${
                  mode === 'login'
                    ? 'glass-pill-jade'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                aria-pressed={mode === 'signup'}
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`press-tactile min-h-[44px] rounded-full px-3 text-[14px] font-semibold transition-all ${
                  mode === 'signup'
                    ? 'glass-pill-jade'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                Đăng ký
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <h2 className="mb-4 text-center text-[16px] font-bold text-[var(--text-primary)]">
              Đặt lại mật khẩu
            </h2>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="glass-badge-overdue mb-4 rounded-[16px] px-3.5 py-2.5 text-[14px] font-medium"
            >
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="glass-badge-paid mb-4 rounded-[16px] px-3.5 py-2.5 text-[14px] font-medium"
            >
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="shop-name"
                  className="mb-1.5 block text-[14px] font-medium text-[var(--text-primary)]"
                >
                  Tên shop
                </label>
                <div className="relative">
                  <Store className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    id="shop-name"
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="Shop của Mẹ"
                    className="glass-input min-h-[48px] w-full rounded-[14px] pr-3.5 pl-10 text-[16px] text-[var(--text-primary)] outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="mb-1.5 block text-[14px] font-medium text-[var(--text-primary)]"
              >
                Email
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
                  className="glass-input min-h-[48px] w-full rounded-[14px] pr-3.5 pl-10 text-[16px] text-[var(--text-primary)] outline-none"
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
                      className="min-h-[44px] text-[13px] font-semibold text-[var(--brand-jade-text)] hover:underline"
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
                    placeholder="Từ 6 ký tự"
                    className="glass-input min-h-[48px] w-full rounded-[14px] pr-12 pl-10 text-[16px] text-[var(--text-primary)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="press-tactile absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="glass-btn-primary press-tactile flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full px-5 text-[16px] font-bold disabled:opacity-60"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              <span>
                {mode === 'login' && (loading ? 'Đang vào...' : 'Đăng nhập')}
                {mode === 'signup' && (loading ? 'Đang tạo...' : 'Tạo tài khoản')}
                {mode === 'forgot' && (loading ? 'Đang gửi...' : 'Gửi email đặt lại')}
              </span>
            </button>
          </form>

          {mode !== 'forgot' && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="glass-divider h-px flex-1 border-t" />
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">hoặc</span>
                <div className="glass-divider h-px flex-1 border-t" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="glass-solid-control press-tactile flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-full px-5 text-[14px] font-semibold text-[var(--text-primary)] disabled:opacity-60"
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
                <span>Tiếp tục với Google</span>
              </button>
            </>
          )}

          {mode === 'forgot' && (
            <div className="glass-divider mt-5 border-t pt-3.5 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="min-h-[44px] text-[14px] font-semibold text-[var(--brand-jade-text)] hover:underline"
              >
                Quay lại đăng nhập
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
