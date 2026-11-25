import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { runReminderCron } from '@/lib/reminders-cron';

export async function POST() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

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
