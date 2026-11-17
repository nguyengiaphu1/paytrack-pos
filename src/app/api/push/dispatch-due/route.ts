import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runReminderCron } from '@/lib/reminders-cron';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json(
      { error: 'Server chưa cấu hình VAPID keys.' },
      { status: 500 }
    );
  }

  try {
    const summary = await runReminderCron(new Date(), { userId: user.id });
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không thể kiểm tra lịch nhắc';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
