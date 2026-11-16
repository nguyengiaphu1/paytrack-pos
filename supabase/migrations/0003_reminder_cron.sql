-- PayTrack POS Reminder Scheduler via Supabase pg_cron + pg_net (Free Tier Compatible)
-- Migration: 0003_reminder_cron.sql
--
-- HƯỚNG DẪN CÀI ĐẶT TRÊN SUPABASE SQL EDITOR:
-- 1. Bật 2 extension `pg_cron` và `pg_net` trong Supabase Dashboard -> Database -> Extensions.
-- 2. Thay thế `<YOUR_VERCEL_DOMAIN>` và `<YOUR_CRON_SECRET>` bên dưới bằng giá trị thật
--    trước khi chạy file SQL này trong Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Xóa lịch cũ nếu chạy lại migration
SELECT cron.unschedule('paytrack_reminder_dispatch')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'paytrack_reminder_dispatch'
);

-- Gọi endpoint /api/cron/reminders mỗi 5 phút để gửi nhắc nợ đúng giờ & tổng hợp sáng
SELECT cron.schedule(
  'paytrack_reminder_dispatch',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<YOUR_VERCEL_DOMAIN>/api/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <YOUR_CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
