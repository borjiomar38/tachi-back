import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { orpc } from '@/lib/orpc/client';

import { useEmailInboxStore } from './use-email-inbox-store';

interface WatcherStatus {
  configured: number;
  connected: number;
}

const parseWatcherStatus = (value: string): WatcherStatus | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    const status = parsed as Record<string, unknown>;
    if (
      typeof status.configured !== 'number' ||
      typeof status.connected !== 'number'
    ) {
      return null;
    }
    return { configured: status.configured, connected: status.connected };
  } catch {
    return null;
  }
};

export const useEmailInboxLive = () => {
  const queryClient = useQueryClient();
  const setLiveState = useEmailInboxStore((state) => state.setLiveState);

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const source = new EventSource('/api/email-inbox/events');

    const refreshInbox = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.emailInbox.list.key(),
            type: 'all',
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.emailInbox.getById.key(),
            type: 'all',
          }),
        ]);
      }, 150);
    };

    source.addEventListener('connected', () => setLiveState('databaseOnly'));
    source.addEventListener('changed', refreshInbox);
    source.addEventListener('watcher', (event) => {
      const status = parseWatcherStatus((event as MessageEvent<string>).data);
      if (!status) return;
      setLiveState(
        status.configured > 0 && status.connected > 0 ? 'live' : 'databaseOnly'
      );
    });
    source.onerror = () => setLiveState('reconnecting');

    return () => {
      clearTimeout(refreshTimer);
      source.close();
      setLiveState('connecting');
    };
  }, [queryClient, setLiveState]);
};
