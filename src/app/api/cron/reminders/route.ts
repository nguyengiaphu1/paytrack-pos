import { NextResponse } from 'next/server';
import { recordCronHeartbeat, runReminderCron } from '@/lib/reminders-cron';

async function handleCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get('authorization')?.trim();

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runReminderCron();
    await recordCronHeartbeat({ status: 'ok', summary });
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown cron error';
    await recordCronHeartbeat({ status: 'error', error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleCronRequest(request);
}

export async function GET(request: Request) {
  return handleCronRequest(request);
}
