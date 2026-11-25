import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { sendPushToSubscriptions } from '@/lib/push';
import type { PushSubscriptionRecord } from '@/types/database';

export async function POST() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json(
      { error: 'Server chưa cấu hình VAPID keys (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).' },
      { status: 500 }
    );
  }

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = (subs as PushSubscriptionRecord[]) ?? [];
  if (list.length === 0) {
    return NextResponse.json({ sent: 0, removed: 0 });
  }

  const result = await sendPushToSubscriptions(list, {
    title: 'PayTrack POS — Thử thông báo',
    body: 'Thông báo nhắc thu nợ trên thiết bị này đã sẵn sàng hoạt động!',
    url: '/debts',
    tag: 'paytrack-test',
  });

  return NextResponse.json(result);
}
