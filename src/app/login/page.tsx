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
    <main className="flex min-h-dvh flex-col bg-[var(--bg-canvas)] px-4 py-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-[440px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandMark className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-bold tracking-[-0.015em] text-[var(--text-primary)]">
              PayTrack POS
            </h1>
            <p className="truncate text-[12px] text-[var(--text-secondary)]">
              Sổ bán hàng &amp; Công nợ
            </p>
          </div>
        </div>
        <ThemeQuickToggle compact />
      </div>

      <div className="mx-auto my-auto w-full max-w-[440px] py-8">
        <section className="animate-fade-in glass-surface rounded-[16px] p-5 sm:p-6">
          {mode !== 'forgot' && (
            <div className="mb-5 grid grid-cols-2 gap-1.5 rounded-[10px] bg-[var(--bg-subtle)] p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`min-h-[44px] rounded-[8px] px-3 text-[14px] font-semibold transition-colors ${
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
                className={`min-h-[44px] rounded-[8px] px-3 text-[14px] font-semibold transition-colors ${
                  mode === 'signup'
                    ? 'border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--brand-jade-text)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Đăng ký
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <h2 className="mb-4 text-[16px] font-bold text-[var(--text-primary)]">
              Đặt lại mật khẩu
            </h2>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mb-4 rounded-[10px] border border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] px-3.5 py-2.5 text-[14px] font-medium text-[var(--status-overdue)]"
            >
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mb-4 rounded-[10px] border border-[var(--status-paid-border)] bg-[var(--status-paid-bg)] px-3.5 py-2.5 text-[14px] font-medium text-[var(--status-paid)]"
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
                    className="min-h-[48px] w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] pr-3.5 pl-10 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
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
                  className="min-h-[48px] w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] pr-3.5 pl-10 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
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
                      className="min-h-[44px] text-[13px] font-medium text-[var(--brand-jade-text)] hover:underline"
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
                    className="min-h-[48px] w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] pr-12 pl-10 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-jade)]"
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
              className="press-tactile flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--brand-jade)] px-4 text-[16px] font-semibold text-white transition-colors hover:bg-[var(--brand-jade-hover)] disabled:opacity-60"
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
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--border-default)]" />
                <span className="text-[12px] text-[var(--text-secondary)]">hoặc</span>
                <div className="h-px flex-1 bg-[var(--border-default)]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="press-tactile flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 text-[14px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] disabled:opacity-60"
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
            <div className="mt-4 border-t border-[var(--border-default)] pt-3 text-center">
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
