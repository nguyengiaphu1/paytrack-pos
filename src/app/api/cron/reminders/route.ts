import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToSubscriptions } from '@/lib/push';
import { formatVND, getTodayVN } from '@/lib/vietnamese';
import type { PushSubscriptionRecord, ShopProfile } from '@/types/database';

function getCurrentTimeHHMM_VN(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const todayVN = getTodayVN();
  const nowHHMM = getCurrentTimeHHMM_VN();

  let customSent = 0;
  let digestSent = 0;
  let removedSubs = 0;

  // 1. Custom scheduled reminders due <= now()
  const { data: pendingReminders } = await admin
    .from('debt_reminders')
    .select('id, user_id, customer_id, message, target_url, customers(name, total_debt)')
    .eq('status', 'pending')
    .lte('scheduled_for', nowIso)
    .limit(100);

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

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', rem.user_id);

    const subList = (subs as PushSubscriptionRecord[]) ?? [];
    if (subList.length > 0) {
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
    }

    await admin
      .from('debt_reminders')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', rem.id);
  }

  // 2. Daily morning digest per shop_profiles
  const { data: profiles } = await admin
    .from('shop_profiles')
    .select('*')
    .eq('reminder_digest_enabled', true);

  for (const profile of (profiles as ShopProfile[]) ?? []) {
    if (profile.last_digest_sent_date === todayVN) continue;
    if (nowHHMM < (profile.reminder_default_hour || '08:30')) continue;

    const { data: dueCustomers } = await admin
      .from('customers')
      .select('id, name, total_debt, next_due_date')
      .eq('user_id', profile.user_id)
      .gt('total_debt', 0)
      .not('next_due_date', 'is', null)
      .lte('next_due_date', todayVN);

    const count = dueCustomers?.length ?? 0;
    if (count > 0) {
      const totalDue = (dueCustomers ?? []).reduce(
        (sum, c) => sum + Number(c.total_debt || 0),
        0
      );

      const { data: subs } = await admin
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', profile.user_id);

      const subList = (subs as PushSubscriptionRecord[]) ?? [];
      if (subList.length > 0) {
        const res = await sendPushToSubscriptions(subList, {
          title: `${profile.shop_name} — Tổng hợp thu nợ hôm nay`,
          body: `Hôm nay có ${count} khách đến hạn/quá hạn thu tổng cộng ${formatVND(totalDue)}.`,
          url: '/debts?filter=due',
          tag: `daily-digest-${todayVN}`,
        });
        digestSent += res.sent;
        removedSubs += res.removed;
      }
    }

    await admin
      .from('shop_profiles')
      .update({ last_digest_sent_date: todayVN })
      .eq('id', profile.id);
  }

  return NextResponse.json({
    ok: true,
    todayVN,
    nowHHMM,
    customSent,
    digestSent,
    removedSubs,
  });
}
