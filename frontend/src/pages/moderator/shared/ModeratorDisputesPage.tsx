import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import api from '@/lib/axios';
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
 * All staff can view + post staff-only replies; designated handlers manage / publish.
 */
export default function ModeratorDisputesPage({
  accent = 'sky',
  title = 'Disputes',
  subtitle = 'View every dispute and leave staff replies. Only the designated handler can publish or change case status.',
  roleLabel,
  endpointBase,
  overviewEndpoint,
  deskLabel,
}: Props) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [handlers, setHandlers] = useState<{ id: string | number; name: string; role: string }[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const requests: Promise<{ data?: { success?: boolean; data?: unknown } }>[] = [
        api.get(endpointBase),
      ];
      if (overviewEndpoint) requests.push(api.get(overviewEndpoint));

      const [disputesRes, overviewRes] = await Promise.all(requests);
      if (disputesRes.data?.success) setDisputes((disputesRes.data.data as Dispute[]) || []);

      const workload =
        (overviewRes?.data?.data as { staffWorkload?: { staffId: string | number; name: string; role: string }[] })
          ?.staffWorkload || [];
      setHandlers(
        workload.map((s) => ({
          id: s.staffId,
          name: s.name,
          role: s.role,
        }))
      );
    } finally {
      setLoading(false);
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
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
        >
          {loading ? (
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
