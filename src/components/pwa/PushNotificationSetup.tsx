'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle2, Loader2, Send, Share, Smartphone } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function detectDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Thiết bị web';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iPhone / iPad PWA';
  if (/Edg\//i.test(ua)) return 'Windows Edge';
  if (/Chrome/i.test(ua)) return 'Windows Chrome';
  return 'Trình duyệt web';
}

export function PushNotificationSetup() {
  const [envState, setEnvState] = useState({
    isIOS: false,
    isStandalone: false,
    pushSupported: false,
    subscribed: false,
    loading: true,
  });
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const ua = navigator.userAgent || '';
    const iosDevice = /iPhone|iPad|iPod/i.test(ua);
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    if (supported) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (!active) return;
          setEnvState({
            isIOS: iosDevice,
            isStandalone: standaloneMode,
            pushSupported: true,
            subscribed: Boolean(sub),
            loading: false,
          });
        })
        .catch(() => {
          if (!active) return;
          setEnvState({
            isIOS: iosDevice,
            isStandalone: standaloneMode,
            pushSupported: true,
            subscribed: false,
            loading: false,
          });
        });
    } else {
      queueMicrotask(() => {
        if (!active) return;
        setEnvState({
          isIOS: iosDevice,
          isStandalone: standaloneMode,
          pushSupported: false,
          subscribed: false,
          loading: false,
        });
      });
    }

    return () => {
      active = false;
    };
  }, []);

  async function handleEnablePush() {
    setErrorMsg(null);
    setStatusMsg(null);
    setBusy(true);
    try {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('Ứng dụng chưa cấu hình NEXT_PUBLIC_VAPID_PUBLIC_KEY.');
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Bạn cần bấm "Cho phép" (Allow) thông báo trên trình duyệt.');
      }

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const subscription =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceLabel: detectDeviceLabel(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Không thể lưu đăng ký thông báo');
      }

      setEnvState((prev) => ({ ...prev, subscribed: true }));
      setStatusMsg('Đã bật thông báo nhắc thu nợ cho thiết bị này!');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể bật thông báo');
    } finally {
      setBusy(false);
    }
  }

  async function handleDisablePush() {
    setErrorMsg(null);
    setStatusMsg(null);
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setEnvState((prev) => ({ ...prev, subscribed: false }));
      setStatusMsg('Đã tắt thông báo trên thiết bị này.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tắt thông báo');
    } finally {
      setBusy(false);
    }
  }

  async function handleSendTest() {
    setErrorMsg(null);
    setStatusMsg(null);
    setBusy(true);
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Không thể gửi thông báo thử');
      }
      if (data.sent > 0) {
        setStatusMsg(`Đã gửi thông báo thử tới ${data.sent} thiết bị!`);
      } else {
        setErrorMsg('Chưa có thiết bị nào đang bật thông báo.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gửi thử thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
            Thông báo nhắc thu nợ trên thiết bị này
          </h3>
          <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
            Hỗ trợ Windows (Chrome/Edge) và iPhone (iOS 16.4+ qua icon Màn hình chính).
          </p>
        </div>
        {envState.subscribed && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--status-paid-bg)] px-2.5 py-1 text-[12px] font-semibold text-[var(--status-paid)]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Đã bật
          </span>
        )}
      </div>

      {envState.isIOS && !envState.isStandalone && (
        <div className="rounded-lg border border-[#FCD34D] bg-[var(--status-debt-bg)] p-3.5 text-[14px] text-[var(--text-primary)]">
          <div className="flex items-center gap-2 font-bold text-[var(--status-debt)]">
            <Smartphone className="h-4 w-4 shrink-0" />
            <span>Hướng dẫn bật thông báo trên iPhone</span>
          </div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px]">
            <li>
              Chạm biểu tượng <strong>Chia sẻ (Share)</strong>{' '}
              <Share className="inline h-3.5 w-3.5" /> ở thanh dưới cùng Safari.
            </li>
            <li>
              Chọn <strong>Thêm vào Màn hình chính (Add to Home Screen)</strong>.
            </li>
            <li>
              Mở lại app từ biểu tượng <strong>PayTrack POS</strong> ngoài màn hình chính rồi bấm nút
              bật thông báo bên dưới.
            </li>
          </ol>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg border border-[#FCA5A5] bg-[var(--status-overdue-bg)] px-3 py-2 text-[13px] font-medium text-[var(--status-overdue)]">
          {errorMsg}
        </div>
      )}

      {statusMsg && (
        <div className="rounded-lg border border-[#5EEAD4] bg-[var(--status-paid-bg)] px-3 py-2 text-[13px] font-medium text-[var(--status-paid)]">
          {statusMsg}
        </div>
      )}

      {envState.loading ? (
        <p className="text-[13px] text-[var(--text-secondary)]">Đang kiểm tra trạng thái...</p>
      ) : !envState.pushSupported ? (
        <p className="text-[13px] text-[var(--text-secondary)]">
          Trình duyệt hiện tại chưa hỗ trợ Web Push (nếu dùng iPhone, vui lòng cài ra Màn hình chính
          trước).
        </p>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {!envState.subscribed ? (
            <button
              type="button"
              disabled={busy}
              onClick={handleEnablePush}
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-4 text-[14px] font-semibold text-white hover:bg-[var(--brand-jade-hover)] disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              <span>Bật thông báo trên thiết bị này</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={handleSendTest}
                className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-4 text-[14px] font-semibold text-white hover:bg-[var(--brand-jade-hover)] disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>Gửi thử thông báo</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDisablePush}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] px-4 text-[14px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] disabled:opacity-60"
              >
                <BellOff className="h-4 w-4" />
                <span>Tắt</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
