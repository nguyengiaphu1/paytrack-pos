import { NextResponse } from 'next/server';
import { runReminderCron } from '@/lib/reminders-cron';

async function handleCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summary = await runReminderCron();
  return NextResponse.json(summary);
}

export async function POST(request: Request) {
  return handleCronRequest(request);
}

export async function GET(request: Request) {
  return handleCronRequest(request);
}
