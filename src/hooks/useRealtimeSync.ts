'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type SyncStatus = 'synced' | 'connecting' | 'offline';

interface UseRealtimeSyncOptions {
  tables: string[];
  onDataChange: () => void;
  channelName?: string;
}

export function useRealtimeSync({
  tables,
  onDataChange,
  channelName = 'paytrack-realtime',
}: UseRealtimeSyncOptions) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const callbackRef = useRef(onDataChange);

  useEffect(() => {
    callbackRef.current = onDataChange;
  }, [onDataChange]);

  const tablesKey = tables.join(',');

  useEffect(() => {
    const syncOnline = () => setIsOnline(navigator.onLine);
    queueMicrotask(syncOnline);

    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);

    return () => {
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`${channelName}-${tablesKey}`);

    for (const table of tablesKey.split(',').filter(Boolean)) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          callbackRef.current();
        }
      );
    }

    channel.subscribe((status) => {
      setRealtimeConnected(status === 'SUBSCRIBED');
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, tablesKey]);

  const status: SyncStatus = !isOnline
    ? 'offline'
    : realtimeConnected
      ? 'synced'
      : 'connecting';

  return { isOnline, realtimeConnected, status };
}
