import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { getTodayVN } from '@/lib/vietnamese';

interface SubscribeBody {
  subscription?: {
    endpoint?: string;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
  deviceLabel?: string;
}

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const overdueCutoffIso = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const todayVN = getTodayVN();

  const [
    { data: subs, error: subErr },
    { count: pendingCount },
    { count: overdueCount },
    { count: dueCustomersCount },
    heartbeatRes,
    profileRes,
  ] = await Promise.all([
    supabase
      .from('push_subscriptions')
      .select('id, endpoint, device_label, last_seen_at, created_at')
      .eq('user_id', user.id)
      .order('last_seen_at', { ascending: false }),
    supabase
      .from('debt_reminders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending'),
    supabase
      .from('debt_reminders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .lte('scheduled_for', overdueCutoffIso),
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gt('total_debt', 0)
      .not('next_due_date', 'is', null)
      .lte('next_due_date', todayVN),
    supabase
      .from('cron_heartbeats')
      .select('job_name, last_run_at, last_status, last_error')
      .eq('job_name', 'paytrack_reminder_dispatch')
      .maybeSingle(),
    supabase
      .from('shop_profiles')
      .select('reminder_digest_enabled, reminder_default_hour, last_digest_sent_date')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (subErr) {
    return NextResponse.json({ error: subErr.message }, { status: 500 });
  }

  const cronHeartbeat = heartbeatRes.error ? null : heartbeatRes.data;
  const digestStatus =
    !profileRes.error && profileRes.data
      ? {
          enabled: Boolean(profileRes.data.reminder_digest_enabled),
          hour: profileRes.data.reminder_default_hour || '08:30',
          sentToday: profileRes.data.last_digest_sent_date === todayVN,
        }
      : null;

  return NextResponse.json({
    devices: subs ?? [],
    pendingReminders: pendingCount ?? 0,
    overdueReminders: overdueCount ?? 0,
    dueCustomersToday: dueCustomersCount ?? 0,
    cronHeartbeat,
    digestStatus,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const body = (await request.json().catch(() => ({}))) as SubscribeBody;
  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const authKey = body.subscription?.keys?.auth;

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json(
      { error: 'Thiếu thông tin Push Subscription hợp lệ' },
      { status: 400 }
    );
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth: authKey,
      device_label: body.deviceLabel?.slice(0, 80) || 'Thiết bị web',
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const body = (await request.json().catch(() => ({}))) as { endpoint?: string };
  if (!body.endpoint) {
    return NextResponse.json({ error: 'Thiếu endpoint' }, { status: 400 });
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', body.endpoint);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
