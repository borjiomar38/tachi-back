import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { create } from 'zustand';

import { orpc } from '@/lib/orpc/client';

import { parsePurchaseTicket } from '@/features/public/purchase-links';
import type { getTokenPurchaseStatus } from '@/server/payments/token-purchase-claim';

interface PurchaseReturnState {
  ticket: string | null;
  loaded: boolean;
  setTicket: (ticket: string | null) => void;
}
export const usePurchaseReturnStore = create<PurchaseReturnState>((set) => ({
  ticket: null,
  loaded: false,
  setTicket: (ticket) => set({ ticket, loaded: true }),
}));
interface UsePurchaseReturnResult {
  ticket: string | null;
  loaded: boolean;
  status: UseQueryResult<Awaited<ReturnType<typeof getTokenPurchaseStatus>>>;
}
export const usePurchaseReturn = (): UsePurchaseReturnResult => {
  const ticket = usePurchaseReturnStore((state) => state.ticket);
  const loaded = usePurchaseReturnStore((state) => state.loaded);
  const setTicket = usePurchaseReturnStore((state) => state.setTicket);
  const initialTicket = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    // StrictMode replays effects after the fragment has already been scrubbed.
    // Keep it only for this mount, never in browser storage or request URLs.
    const captureTicket = () => {
      if (window.location.hash || initialTicket.current === undefined) {
        initialTicket.current = parsePurchaseTicket(window.location.hash);
      }
      setTicket(initialTicket.current ?? null);
      if (window.location.hash) {
        window.history.replaceState(
          window.history.state,
          '',
          window.location.pathname
        );
      }
    };
    captureTicket();
    window.addEventListener('hashchange', captureTicket);
    return () => {
      window.removeEventListener('hashchange', captureTicket);
      setTicket(null);
    };
  }, [setTicket]);
  const status = useQuery({
    ...orpc.tokenPurchase.status.queryOptions({
      input: { ticket: ticket ?? '' },
    }),
    enabled: Boolean(ticket),
    retry: false,
    refetchInterval: (query) => {
      if (query.state.error || query.state.data?.state !== 'pending')
        return false;
      return query.state.dataUpdateCount < 20 ? 2500 : false;
    },
    gcTime: 0,
  });
  return { ticket, loaded, status };
};
