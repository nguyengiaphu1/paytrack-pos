-- PayTrack POS Cron Heartbeat Tracking (Diagnostics & Observability)
-- Migration: 0004_cron_heartbeat.sql

CREATE TABLE IF NOT EXISTS public.cron_heartbeats (
  job_name text PRIMARY KEY,
  last_run_at timestamptz NOT NULL DEFAULT now(),
  last_status text NOT NULL CHECK (last_status IN ('ok', 'error')),
  last_summary jsonb,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cron_heartbeats ENABLE ROW LEVEL SECURITY;

-- Chỉ chứa metadata vận hành (không có dữ liệu khách hàng hay bí mật); chỉ service_role được ghi.
DROP POLICY IF EXISTS "cron_heartbeats_authenticated_read" ON public.cron_heartbeats;
CREATE POLICY "cron_heartbeats_authenticated_read" ON public.cron_heartbeats
  FOR SELECT TO authenticated
  USING (true);
