import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/axios';
import { useCaseEvents } from '@/lib/cases';
import type { AppealOptions } from './appealShared';

const EMPTY: AppealOptions = { perPenalty: true, legacyOpenAppeal: null, penalties: [] };

/**
 * The member's active penalties, each with its own appeal state (`GET /api/users/appeals`).
 * Re-reads when the standing changes (a penalty starting or ending) and on every case event (an
 * appeal filed, answered or decided).
 */
export function useAppealOptions(standingKey: string) {
  const [options, setOptions] = useState<AppealOptions>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const loadedRef = useRef(false);

  const reload = useCallback(async () => {
    try {
      const res = await api.get('/api/users/appeals');
      const data = res.data?.data as AppealOptions | undefined;
      setOptions({
        perPenalty: data?.perPenalty !== false,
        legacyOpenAppeal: data?.legacyOpenAppeal || null,
        penalties: Array.isArray(data?.penalties) ? data.penalties : [],
      });
      loadedRef.current = true;
      setError(false);
    } catch {
      // A failed background refresh keeps what is already shown.
      setError(!loadedRef.current);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, standingKey]);

  const timerRef = useRef<number | undefined>(undefined);
  const scheduleReload = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void reload(), 300);
  }, [reload]);
  useEffect(() => () => window.clearTimeout(timerRef.current), []);
  useCaseEvents(scheduleReload);

  return { options, loading, error, reload };
}
