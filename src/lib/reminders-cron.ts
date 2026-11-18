import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToSubscriptions } from '@/lib/push';
import {
  formatVND,
  getCurrentTimeHHMM_VN,
  getTodayVN,
  normalizeHHMM,
} from '@/lib/vietnamese';
import type { PushSubscriptionRecord, ShopProfile } from '@/types/database';

export { getCurrentTimeHHMM_VN, normalizeHHMM };

export interface CronRemindersSummary {
  ok: true;
  todayVN: string;
  nowHHMM: string;
  customSent: number;
  customFailed: number;
  digestSent: number;
  digestFailed: number;
  removedSubs: number;
}

export interface RunReminderCronOptions {
  userId?: string;
}

export async function runReminderCron(
  now: Date = new Date(),
  options: RunReminderCronOptions = {}
): Promise<CronRemindersSummary> {
  const admin = createAdminClient();
  const nowIso = now.toISOString();
  const todayVN = getTodayVN(now);
  const nowHHMM = getCurrentTimeHHMM_VN(now);
  const scopedUserId = options.userId;

  let customSent = 0;
  let customFailed = 0;
  let digestSent = 0;
  let digestFailed = 0;
  let removedSubs = 0;

  // 1. Custom scheduled reminders due <= now()
  let remindersQuery = admin
    .from('debt_reminders')
    .select('id, user_id, customer_id, message, target_url, customers(name, total_debt)')
    .eq('status', 'pending')
    .lte('scheduled_for', nowIso);

  if (scopedUserId) {
    remindersQuery = remindersQuery.eq('user_id', scopedUserId);
  }

  const { data: pendingReminders, error: remindersError } = await remindersQuery.limit(100);
  if (remindersError) {
    console.error('[cron/reminders] failed querying debt_reminders', remindersError);
    throw new Error(`Không thể truy vấn debt_reminders: ${remindersError.message}`);
  }

  for (const rem of pendingReminders ?? []) {
    const customerObj = Array.isArray(rem.customers) ? rem.customers[0] : rem.customers;
    const customerName = customerObj?.name ?? 'Khách hàng';
    const customerDebt = Number(customerObj?.total_debt ?? 0);

    // Nếu khách đã trả hết nợ trước giờ nhắc, bỏ qua và đánh dấu dismissed
    if (customerDebt <= 0) {
      await admin
        .from('debt_reminders')
        .update({ status: 'dismissed' })
        .eq('id', rem.id);
      continue;
    }

    const { data: subs, error: subsError } = await admin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', rem.user_id);

    if (subsError) {
      console.error('[cron/reminders] failed querying push_subscriptions', subsError);
      throw new Error(`Không thể truy vấn push_subscriptions: ${subsError.message}`);
    }

    const subList = (subs as PushSubscriptionRecord[]) ?? [];
    if (subList.length === 0) {
      customFailed += 1;
      console.warn('[cron/reminders] no push subscriptions for reminder', {
        reminderId: rem.id,
        userId: rem.user_id,
      });
      continue;
    }

    const res = await sendPushToSubscriptions(subList, {
      title: `Nhắc thu nợ — ${customerName}`,
      body:
        rem.message?.trim() ||
        `${customerName} hiện còn nợ ${formatVND(customerDebt)}. Chạm để mở thẻ công nợ & tạo QR.`,
      url: rem.target_url || `/debts?customer=${rem.customer_id}`,
      tag: `debt-reminder-${rem.id}`,
    });
    customSent += res.sent;
    removedSubs += res.removed;

    if (res.sent > 0) {
      await admin
        .from('debt_reminders')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', rem.id);
    } else {
      customFailed += 1;
    }
  }

  // 2. Daily morning digest per shop_profiles
  let profilesQuery = admin
    .from('shop_profiles')
    .select('*')
    .eq('reminder_digest_enabled', true);

  if (scopedUserId) {
    profilesQuery = profilesQuery.eq('user_id', scopedUserId);
  }

  const { data: profiles, error: profilesError } = await profilesQuery;
  if (profilesError) {
    console.error('[cron/reminders] failed querying shop_profiles', profilesError);
    throw new Error(`Không thể truy vấn shop_profiles: ${profilesError.message}`);
  }

  for (const profile of (profiles as ShopProfile[]) ?? []) {
    if (profile.last_digest_sent_date === todayVN) continue;
    if (nowHHMM < normalizeHHMM(profile.reminder_default_hour, '08:30')) continue;

    const { data: dueCustomers, error: dueError } = await admin
      .from('customers')
      .select('id, name, total_debt, next_due_date')
      .eq('user_id', profile.user_id)
      .gt('total_debt', 0)
      .not('next_due_date', 'is', null)
      .lte('next_due_date', todayVN);

    if (dueError) {
      console.error('[cron/reminders] failed querying due customers', dueError);
      throw new Error(`Không thể truy vấn customers: ${dueError.message}`);
    }

    const count = dueCustomers?.length ?? 0;
    if (count === 0) continue;

    const totalDue = (dueCustomers ?? []).reduce(
      (sum, c) => sum + Number(c.total_debt || 0),
      0
    );

    const { data: subs, error: subsError } = await admin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', profile.user_id);

    if (subsError) {
      console.error('[cron/reminders] failed querying push_subscriptions for digest', subsError);
      throw new Error(`Không thể truy vấn push_subscriptions: ${subsError.message}`);
    }

    const subList = (subs as PushSubscriptionRecord[]) ?? [];
    if (subList.length === 0) {
      digestFailed += 1;
      continue;
    }

    const res = await sendPushToSubscriptions(subList, {
      title: `${profile.shop_name} — Tổng hợp thu nợ hôm nay`,
      body: `Hôm nay có ${count} khách đến hạn/quá hạn thu tổng cộng ${formatVND(totalDue)}.`,
      url: '/debts?filter=due',
      tag: `daily-digest-${todayVN}`,
    });
    digestSent += res.sent;
    removedSubs += res.removed;

    if (res.sent > 0) {
      await admin
        .from('shop_profiles')
        .update({ last_digest_sent_date: todayVN })
        .eq('id', profile.id);
    } else {
      digestFailed += 1;
    }
  }

  return {
    ok: true,
    todayVN,
    nowHHMM,
    customSent,
    customFailed,
    digestSent,
    digestFailed,
    removedSubs,
  };
}

export async function recordCronHeartbeat(params: {
  jobName?: string;
  status: 'ok' | 'error';
  summary?: CronRemindersSummary;
  error?: string | null;
}) {
  try {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();
    const { error } = await admin.from('cron_heartbeats').upsert(
      {
        job_name: params.jobName ?? 'paytrack_reminder_dispatch',
        last_run_at: nowIso,
        last_status: params.status,
        last_summary: params.summary ?? null,
        last_error: params.error ? params.error.slice(0, 500) : null,
        updated_at: nowIso,
      },
      { onConflict: 'job_name' }
    );
    if (error) {
      // Bảng cron_heartbeats có thể chưa được migrate trên production; không làm hỏng cron chính.
      console.warn('[cron/reminders] could not record cron_heartbeats:', error.message);
    }
  } catch (err) {
    console.warn('[cron/reminders] heartbeat error:', err);
  }
}
