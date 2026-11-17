'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  Send,
  Share,
  Smartphone,
} from 'lucide-react';
import { formatDateTimeVN } from '@/lib/vietnamese';

interface RegisteredDevice {
  id: string;
  endpoint: string;
  device_label: string | null;
  last_seen_at: string;
}

interface CronHeartbeat {
  job_name: string;
  last_run_at: string;
  last_status: 'ok' | 'error';
  last_error: string | null;
}

interface SubscribeStatusPayload {
  devices?: RegisteredDevice[];
  pendingReminders?: number;
  overdueReminders?: number;
  dueCustomersToday?: number;
  cronHeartbeat?: CronHeartbeat | null;
}

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
  if (/Android/i.test(ua)) return 'Android Chrome/PWA';
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
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [pendingReminders, setPendingReminders] = useState(0);
  const [overdueReminders, setOverdueReminders] = useState(0);
  const [dueCustomersToday, setDueCustomersToday] = useState(0);
  const [cronHeartbeat, setCronHeartbeat] = useState<CronHeartbeat | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function applyStatusPayload(json: SubscribeStatusPayload) {
    setDevices(json.devices ?? []);
    setPendingReminders(json.pendingReminders ?? 0);
    setOverdueReminders(json.overdueReminders ?? 0);
    setDueCustomersToday(json.dueCustomersToday ?? 0);
    setCronHeartbeat(json.cronHeartbeat ?? null);
  }

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

    async function syncAndCheck() {
      if (!supported) {
        if (!active) return;
        setEnvState({
          isIOS: iosDevice,
          isStandalone: standaloneMode,
          pushSupported: false,
          subscribed: false,
          loading: false,
        });
        return;
      }

      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        const sub = await reg.pushManager.getSubscription();

        const serverRes = await fetch('/api/push/subscribe').catch(() => null);
        let serverPayload: SubscribeStatusPayload = {};

        if (serverRes && serverRes.ok) {
          serverPayload = (await serverRes.json().catch(() => ({}))) as SubscribeStatusPayload;
        }

        const serverDevices = serverPayload.devices ?? [];

        // Nếu trình duyệt đã có subscription nhưng server chưa lưu (hoặc hết phiên cũ), tự đồng bộ lại
        if (sub && Notification.permission === 'granted') {
          const alreadySynced = serverDevices.some((d) => d.endpoint === sub.endpoint);
          if (!alreadySynced) {
            const syncRes = await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subscription: sub.toJSON(),
                deviceLabel: detectDeviceLabel(),
              }),
            }).catch(() => null);

            if (syncRes && syncRes.ok) {
              const refreshed = await fetch('/api/push/subscribe').catch(() => null);
              if (refreshed && refreshed.ok) {
                serverPayload = (await refreshed.json().catch(() => ({}))) as SubscribeStatusPayload;
              }
            }
          }
        }

        if (!active) return;
        setDevices(serverPayload.devices ?? []);
        setPendingReminders(serverPayload.pendingReminders ?? 0);
        setOverdueReminders(serverPayload.overdueReminders ?? 0);
        setDueCustomersToday(serverPayload.dueCustomersToday ?? 0);
        setCronHeartbeat(serverPayload.cronHeartbeat ?? null);
        setEnvState({
          isIOS: iosDevice,
          isStandalone: standaloneMode,
          pushSupported: true,
          subscribed: Boolean(sub) && Notification.permission === 'granted',
          loading: false,
        });
      } catch {
        if (!active) return;
        setEnvState({
          isIOS: iosDevice,
          isStandalone: standaloneMode,
          pushSupported: true,
          subscribed: false,
          loading: false,
        });
      }
    }

    void syncAndCheck();

    return () => {
      active = false;
    };
  }, []);

  async function refreshDevicesFromServer() {
    const res = await fetch('/api/push/subscribe').catch(() => null);
    if (res && res.ok) {
      const json = (await res.json().catch(() => ({}))) as SubscribeStatusPayload;
      applyStatusPayload(json);
    }
  }

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

      await refreshDevicesFromServer();
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
      await refreshDevicesFromServer();
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

  async function handleDispatchDue() {
    setErrorMsg(null);
    setStatusMsg(null);
    setBusy(true);
    try {
      const res = await fetch('/api/push/dispatch-due', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        customSent?: number;
        customFailed?: number;
        digestSent?: number;
        digestFailed?: number;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Không thể kiểm tra lịch nhắc đến hạn');
      }
      await refreshDevicesFromServer();
      const totalSent = (data.customSent ?? 0) + (data.digestSent ?? 0);
      const totalFailed = (data.customFailed ?? 0) + (data.digestFailed ?? 0);
      if (totalSent > 0) {
        setStatusMsg(
          `Đã gửi ngay ${data.customSent ?? 0} thông báo hẹn nhắc và ${data.digestSent ?? 0} tổng hợp ngày.`
        );
      } else if (totalFailed > 0) {
        setErrorMsg(
          'Có lịch đến hạn nhưng không gửi được tới thiết bị (hãy bấm "Bật thông báo" lại trên thiết bị).'
        );
      } else {
        setStatusMsg(
          'Hiện chưa có lịch hẹn nào quá giờ hoặc chưa tới giờ tổng hợp / chưa có khách đến hạn hôm nay.'
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Kiểm tra lịch nhắc thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-bold text-[var(--text-primary)]">
            2. Thông báo nhắc thu nợ trên thiết bị này
          </h2>
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
        <div className="rounded-lg border border-[var(--status-debt-border)] bg-[var(--status-debt-bg)] p-3.5 text-[14px] text-[var(--text-primary)]">
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
        <div className="rounded-lg border border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] px-3 py-2 text-[13px] font-medium text-[var(--status-overdue)]">
          {errorMsg}
        </div>
      )}

      {statusMsg && (
        <div className="rounded-lg border border-[var(--status-paid-border)] bg-[var(--status-paid-bg)] px-3 py-2 text-[13px] font-medium text-[var(--status-paid)]">
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
              className="press-tactile flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-4 text-[14px] font-semibold text-white hover:bg-[var(--brand-jade-hover)] disabled:opacity-60"
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
                className="press-tactile flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--brand-jade)] px-4 text-[14px] font-semibold text-white hover:bg-[var(--brand-jade-hover)] disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>Gửi thử thông báo</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDispatchDue}
                className="press-tactile flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[var(--brand-jade)] bg-[var(--bg-surface)] px-3.5 text-[13px] font-semibold text-[var(--brand-jade-text)] hover:bg-[var(--status-paid-bg)] disabled:opacity-60 sm:text-[14px]"
              >
                <Clock className="h-4 w-4 shrink-0" />
                <span>Gửi lịch đến hạn ngay</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDisablePush}
                className="press-tactile flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] px-4 text-[14px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] disabled:opacity-60"
              >
                <BellOff className="h-4 w-4" />
                <span>Tắt</span>
              </button>
            </>
          )}
        </div>
      )}

      {cronHeartbeat?.last_status === 'error' && (
        <div className="rounded-lg border border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] p-3 text-[12px] text-[var(--status-overdue)]">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Bộ hẹn giờ tự động (Cron) gặp lỗi gần nhất</span>
          </div>
          {cronHeartbeat.last_error && (
            <p className="mt-1 break-words">{cronHeartbeat.last_error}</p>
          )}
        </div>
      )}

      {(overdueReminders > 0 || (!cronHeartbeat && (pendingReminders > 0 || dueCustomersToday > 0))) && (
        <div className="rounded-lg border border-[var(--status-debt-border)] bg-[var(--status-debt-bg)] p-3 text-[12px] text-[var(--text-primary)]">
          <div className="flex items-center gap-1.5 font-bold text-[var(--status-debt)]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {overdueReminders > 0
                ? `Có ${overdueReminders} lịch hẹn nhắc đã quá giờ nhưng chưa được tự động gửi`
                : 'Hệ thống hẹn giờ tự động (Supabase pg_cron) chưa ghi nhận lượt chạy nào'}
            </span>
          </div>
          <p className="mt-1 leading-relaxed text-[var(--text-secondary)]">
            Thông báo đặt lịch &amp; tổng hợp sáng cần job{' '}
            <code className="font-mono-tabular font-semibold">paytrack_reminder_dispatch</code> trong{' '}
            <code className="font-mono-tabular">0003_reminder_cron.sql</code> được cấu hình đúng
            tên miền Vercel và <code className="font-mono-tabular">CRON_SECRET</code> trên Supabase.
            Bạn có thể bấm <strong>Gửi lịch đến hạn ngay</strong> ở trên để đẩy các lịch bị trễ.
          </p>
        </div>
      )}

      {/* Trạng thái thiết bị đã đăng ký & hướng dẫn nhận thông báo khi đóng app */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3 text-[12px] text-[var(--text-secondary)]">
        <div className="flex flex-wrap items-center justify-between gap-2 font-semibold text-[var(--text-primary)]">
          <span>Thiết bị đang nhận nhắc nợ ({devices.length})</span>
          <div className="flex flex-wrap items-center gap-2">
            {dueCustomersToday > 0 && (
              <span className="font-mono-tabular text-[var(--status-debt)]">
                {dueCustomersToday} khách đến hạn hôm nay
              </span>
            )}
            {pendingReminders > 0 && (
              <span className="font-mono-tabular text-[var(--brand-jade-text)]">
                {pendingReminders} lịch hẹn đang chờ
              </span>
            )}
          </div>
        </div>
        {devices.length > 0 && (
          <p className="mt-1 break-words">
            {devices.map((d) => d.device_label || 'Thiết bị web').join(' · ')}
          </p>
        )}
        {cronHeartbeat?.last_status === 'ok' && (
          <p className="mt-1 font-mono-tabular text-[11px] text-[var(--text-secondary)]">
            Kiểm tra lịch tự động gần nhất: {formatDateTimeVN(cronHeartbeat.last_run_at)}
          </p>
        )}
        <div className="mt-2 flex items-start gap-1.5 border-t border-[var(--border-default)] pt-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand-jade-text)]" />
          <p className="leading-relaxed">
            <strong>Để nhận thông báo cả khi không mở app:</strong> Trên iPhone giữ icon{' '}
            <em>PayTrack POS</em> ngoài Màn hình chính (không cần mở sẵn app). Trên Windows, hãy{' '}
            <strong>Cài đặt ứng dụng (Install app)</strong> từ thanh địa chỉ Chrome/Edge hoặc bật{' '}
            <em>&ldquo;Tiếp tục chạy ứng dụng nền khi đóng trình duyệt&rdquo;</em> trong cài đặt
            Chrome/Edge.
          </p>
        </div>
      </div>
    </div>
  );
}
