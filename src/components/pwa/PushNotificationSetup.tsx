'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronDown,
  Clock,
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

interface DigestStatus {
  enabled: boolean;
  hour: string;
  sentToday: boolean;
}

interface SubscribeStatusPayload {
  devices?: RegisteredDevice[];
  pendingReminders?: number;
  overdueReminders?: number;
  dueCustomersToday?: number;
  cronHeartbeat?: CronHeartbeat | null;
  digestStatus?: DigestStatus | null;
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
  if (/Android/i.test(ua)) return 'Android PWA';
  if (/Edg\//i.test(ua)) return 'Windows Edge';
  if (/Chrome/i.test(ua)) return 'Windows Chrome';
  return 'Trình duyệt web';
}

export function PushNotificationSetup({ embedded = false }: { embedded?: boolean }) {
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
  const [digestStatus, setDigestStatus] = useState<DigestStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const applyStatusPayload = useCallback((json: SubscribeStatusPayload) => {
    setDevices(json.devices ?? []);
    setPendingReminders(json.pendingReminders ?? 0);
    setOverdueReminders(json.overdueReminders ?? 0);
    setDueCustomersToday(json.dueCustomersToday ?? 0);
    setCronHeartbeat(json.cronHeartbeat ?? null);
    setDigestStatus(json.digestStatus ?? null);
  }, []);

  const refreshDevicesFromServer = useCallback(async (): Promise<SubscribeStatusPayload | null> => {
    const res = await fetch('/api/push/subscribe').catch(() => null);
    if (res && res.ok) {
      const json = (await res.json().catch(() => ({}))) as SubscribeStatusPayload;
      applyStatusPayload(json);
      return json;
    }
    return null;
  }, [applyStatusPayload]);

  useEffect(() => {
    let active = true;
    const ua = navigator.userAgent || '';
    const iosDevice = /iPhone|iPad|iPod/i.test(ua);
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

    const supported =
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

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
        applyStatusPayload(serverPayload);
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

    const handleProfileSaved = () => {
      void refreshDevicesFromServer();
    };

    void syncAndCheck();
    window.addEventListener('paytrack:profile-saved', handleProfileSaved);

    return () => {
      active = false;
      window.removeEventListener('paytrack:profile-saved', handleProfileSaved);
    };
  }, [applyStatusPayload, refreshDevicesFromServer]);

  async function handleEnablePush() {
    setErrorMsg(null);
    setStatusMsg(null);
    setBusy(true);
    try {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('Thiếu cấu hình khóa thông báo.');
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Cần bấm Cho phép thông báo trên trình duyệt.');
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
        throw new Error(body.error || 'Không thể bật thông báo');
      }

      await refreshDevicesFromServer();
      setEnvState((prev) => ({ ...prev, subscribed: true }));
      setStatusMsg('Đã bật thông báo trên máy này.');
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
      setStatusMsg('Đã tắt thông báo trên máy này.');
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
      if (!res.ok) throw new Error(data.error || 'Gửi thử thất bại');
      if (data.sent > 0) {
        setStatusMsg(`Đã gửi thử tới ${data.sent} máy.`);
      } else {
        setErrorMsg('Chưa có thiết bị nào bật thông báo.');
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
      if (!res.ok) throw new Error(data.error || 'Không thể kiểm tra lịch nhắc');
      await refreshDevicesFromServer();
      const totalSent = (data.customSent ?? 0) + (data.digestSent ?? 0);
      const totalFailed = (data.customFailed ?? 0) + (data.digestFailed ?? 0);
      if (totalSent > 0) {
        setStatusMsg(`Đã gửi ${totalSent} thông báo đến hạn.`);
      } else if (totalFailed > 0) {
        setErrorMsg('Gửi thất bại — hãy bật lại thông báo trên máy.');
      } else {
        setStatusMsg('Hiện chưa có lịch nhắc nào đến giờ.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Kiểm tra lịch nhắc thất bại');
    } finally {
      setBusy(false);
    }
  }

  const hasWarning =
    cronHeartbeat?.last_status === 'error' || overdueReminders > 0;

  return (
    <div
      className={
        embedded
          ? 'space-y-3'
          : 'space-y-3 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:p-5'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[14px] font-semibold text-[var(--text-primary)]">
            Thông báo trên máy này
          </span>
          {envState.subscribed && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--status-paid-bg)] px-2 py-0.5 text-[12px] font-semibold text-[var(--status-paid)]">
              <CheckCircle2 className="h-3 w-3" />
              Đang bật
            </span>
          )}
        </div>

        {envState.loading ? (
          <span className="text-[13px] text-[var(--text-secondary)]">Đang kiểm tra...</span>
        ) : !envState.pushSupported ? (
          <span className="text-[12px] text-[var(--text-secondary)]">
            Cần cài ra Màn hình chính
          </span>
        ) : !envState.subscribed ? (
          <button
            type="button"
            disabled={busy}
            onClick={handleEnablePush}
            className="press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] bg-[var(--brand-jade)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--brand-jade-hover)] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            <span>Bật thông báo</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={handleDisablePush}
            className="press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border border-[var(--border-default)] px-3.5 text-[13px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
            <span>Tắt</span>
          </button>
        )}
      </div>

      {envState.isIOS && !envState.isStandalone && (
        <div className="rounded-[10px] border border-[var(--status-debt-border)] bg-[var(--status-debt-bg)] p-3 text-[13px] text-[var(--text-primary)]">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--status-debt)]">
            <Smartphone className="h-4 w-4 shrink-0" />
            <span>iPhone: Chia sẻ</span>
            <Share className="h-3.5 w-3.5 shrink-0" />
            <span>→ Thêm vào Màn hình chính → Mở lại app</span>
          </div>
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

      {hasWarning && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--status-debt-border)] bg-[var(--status-debt-bg)] px-3 py-2 text-[12px] text-[var(--status-debt)]">
          <span className="flex min-w-0 items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {overdueReminders > 0
                ? `${overdueReminders} lịch nhắc đang chờ gửi`
                : 'Lịch tự động gặp lỗi gần nhất'}
            </span>
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={handleDispatchDue}
            className="press-tactile min-h-[44px] shrink-0 rounded-md border border-[var(--status-debt)] bg-[var(--bg-surface)] px-2.5 text-[12px] font-semibold text-[var(--status-debt)]"
          >
            Gửi ngay
          </button>
        </div>
      )}

      {/* Collapsible Technical Diagnostics (clean by default, full power on demand) */}
      <details className="group rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-[12px] text-[var(--text-secondary)]">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 font-medium text-[var(--text-secondary)]">
          <span>
            Kiểm tra kết nối ({devices.length} máy
            {dueCustomersToday > 0 ? ` · ${dueCustomersToday} khách đến hạn` : ''})
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
        </summary>

        <div className="space-y-2.5 border-t border-[var(--border-default)] pt-2.5 pb-1">
          {envState.subscribed && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleSendTest}
                className="press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[12px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] disabled:opacity-60"
              >
                <Send className="h-3.5 w-3.5 text-[var(--brand-jade-text)]" />
                <span>Gửi thử</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDispatchDue}
                className="press-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[12px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] disabled:opacity-60"
              >
                <Clock className="h-3.5 w-3.5 text-[var(--brand-jade-text)]" />
                <span>Gửi lịch đến hạn</span>
              </button>
            </div>
          )}

          {devices.length > 0 && (
            <p className="break-words">
              Thiết bị: {devices.map((d) => d.device_label || 'Web').join(' · ')}
            </p>
          )}
          {pendingReminders > 0 && (
            <p className="font-mono-tabular">Lịch hẹn đang chờ: {pendingReminders}</p>
          )}
          {digestStatus && (
            <p className="font-mono-tabular">
              Tổng hợp ngày: {digestStatus.enabled ? `${digestStatus.hour} (${digestStatus.sentToday ? 'đã gửi' : 'chờ'})` : 'tắt'}
            </p>
          )}
          {cronHeartbeat && (
            <p className="font-mono-tabular">
              Kiểm tra gần nhất: {formatDateTimeVN(cronHeartbeat.last_run_at)} (
              {cronHeartbeat.last_status})
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
