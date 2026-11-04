import { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import DisputeDesk from './DisputeDesk';
import type { Dispute } from './moderatorTypes';

type Accent = 'rose' | 'sky' | 'emerald' | 'violet' | 'amber';

const ACCENT_LABEL: Record<Accent, string> = {
  rose: 'text-rose-400',
  sky: 'text-sky-400',
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
  amber: 'text-amber-400',
};

/** deskMode accents supported by DisputeDesk */
type DeskAccent = 'rose' | 'sky' | 'emerald';

function toDeskAccent(accent: Accent): DeskAccent {
  if (accent === 'sky') return 'sky';
  if (accent === 'emerald' || accent === 'violet') return 'emerald';
  return 'rose';
}

function workloadHandlers(overview: { data?: { data?: unknown } } | undefined) {
  const workload =
    (overview?.data?.data as { staffWorkload?: { staffId: string | number; name: string; role: string }[] })
      ?.staffWorkload || [];
  return workload.map((s) => ({
    id: s.staffId,
    name: s.name,
    role: s.role,
  }));
}

type Props = {
  accent?: Accent;
  title?: string;
  subtitle?: string;
  roleLabel: string;
  endpointBase: string;
  overviewEndpoint?: string;
  deskLabel: string;
};

/**
 * Shared disputes desk for every moderator console.
 * All staff can view + post staff-only replies; only Support/Admin claim and handle.
 */
export default function ModeratorDisputesPage({
  accent = 'sky',
  title = 'Disputes',
  subtitle = 'View disputes and leave staff replies. Only Support Moderators or Admin can claim a case, change status, or publish to parties.',
  roleLabel,
  endpointBase,
  overviewEndpoint,
  deskLabel,
}: Props) {
  const [disputes, setDisputes] = useState<Dispute[]>(() => {
    const cached = peekStaffGet(endpointBase);
    return cached?.data?.success ? (cached.data.data as Dispute[]) || [] : [];
  });
  const [handlers, setHandlers] = useState<{ id: string | number; name: string; role: string }[]>(() =>
    workloadHandlers(overviewEndpoint ? peekStaffGet(overviewEndpoint) : undefined)
  );
  const [loading, setLoading] = useState(() => !peekStaffGet(endpointBase)?.data?.success);
  const [refreshing, setRefreshing] = useState(false);
  const hasData = useRef(!loading);

  const load = async () => {
    if (hasData.current) setRefreshing(true);
    else setLoading(true);
    try {
      const requests: Promise<{ data?: { success?: boolean; data?: unknown } }>[] = [
        staffGet(endpointBase),
      ];
      if (overviewEndpoint) requests.push(staffGet(overviewEndpoint));

      const [disputesRes, overviewRes] = await Promise.all(requests);
      if (disputesRes.data?.success) {
        hasData.current = true;
        setDisputes((disputesRes.data.data as Dispute[]) || []);
      }

      setHandlers(workloadHandlers(overviewRes));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, [endpointBase, overviewEndpoint]);

  return (
    <main
      className="relative z-10 min-h-screen px-6 py-8 md:pl-[260px] md:px-10"
      style={{ animation: 'fadeIn 420ms ease' }}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${ACCENT_LABEL[accent]}`}>
            {roleLabel}
          </p>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || refreshing}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
        >
          {loading || refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      <DisputeDesk
        disputes={disputes}
        handlers={handlers}
        onUpdated={() => void load()}
        accent={toDeskAccent(accent)}
        endpointBase={endpointBase}
        deskMode
        deskLabel={deskLabel}
        loading={loading}
      />
    </main>
  );
}
