import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PushSubscriptionRecord } from '@/types/database';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'https://paytrack-pos.vercel.app';

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export interface SendPushResult {
  sent: number;
  removed: number;
  failed: number;
  errors: Array<{ statusCode: number; message: string }>;
}

export async function sendPushToSubscriptions(
  subscriptions: PushSubscriptionRecord[],
  payload: PushPayload
): Promise<SendPushResult> {
  if (!ensureVapidConfigured() || subscriptions.length === 0) {
    return { sent: 0, removed: 0, failed: 0, errors: [] };
  }

  const admin = createAdminClient();
  let sent = 0;
  let removed = 0;
  let failed = 0;
  const errors: Array<{ statusCode: number; message: string }> = [];

  const jsonPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag || 'paytrack-reminder',
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          jsonPayload,
          {
            TTL: 86400,
            urgency: 'high',
          }
        );
        sent += 1;
      } catch (err: unknown) {
        const statusCode =
          typeof err === 'object' && err !== null && 'statusCode' in err
            ? Number((err as { statusCode?: number }).statusCode)
            : 0;
        const errMsg =
          err instanceof Error ? err.message : 'Unknown push delivery error';

        // Xóa ngay endpoint hết hạn (410 Gone / 404 Not Found)
        if (statusCode === 410 || statusCode === 404) {
          await admin.from('push_subscriptions').delete().eq('id', sub.id);
          removed += 1;
        } else {
          failed += 1;
          errors.push({ statusCode, message: errMsg });
          console.error('[push] delivery failed', {
            subId: sub.id,
            deviceLabel: sub.device_label,
            statusCode,
            message: errMsg,
          });
        }
      }
    })
  );

  return { sent, removed, failed, errors };
}
