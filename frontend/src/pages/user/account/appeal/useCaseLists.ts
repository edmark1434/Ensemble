import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/axios';
import { useCaseEvents } from '@/lib/cases';
import type { DisputeRow, TicketRow } from './appealShared';

/**
 * A member's tickets and disputes, each with the server's `access`. Shared by the Cases page
 * and the appeal page so both show the same cases with the same rules. Re-reads on every case
 * event and whenever `standingKey` changes (a penalty starting or ending changes what the
 * member may do on every case).
 */
export function useCaseLists(standingKey: string) {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [listsError, setListsError] = useState(false);
  const loadedRef = useRef(false);

  const loadLists = useCallback(async () => {
    const [ticketResult, disputeResult] = await Promise.allSettled([
      api.get('/api/users/tickets'),
      api.get('/api/users/disputes'),
    ]);
    if (ticketResult.status === 'fulfilled') setTickets(ticketResult.value.data?.data || []);
    if (disputeResult.status === 'fulfilled') setDisputes(disputeResult.value.data?.data || []);
    const failed = ticketResult.status === 'rejected' && disputeResult.status === 'rejected';
    // A failed background refresh keeps what is already shown.
    if (!failed) loadedRef.current = true;
    setListsError(failed && !loadedRef.current);
    setListsLoading(false);
    if (failed) throw ticketResult.reason;
  }, []);

  useEffect(() => {
    void loadLists().catch(() => undefined);
  }, [loadLists, standingKey]);

  // Several events can land together (a ruling posts a message and changes the status).
  const timerRef = useRef<number | undefined>(undefined);
  const scheduleReload = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void loadLists().catch(() => undefined), 250);
  }, [loadLists]);
  useEffect(() => () => window.clearTimeout(timerRef.current), []);
  useCaseEvents(scheduleReload);

  return { tickets, disputes, listsLoading, listsError, loadLists };
}
