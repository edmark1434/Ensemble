import { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import ReportDesk from './ReportDesk';
import type { UserReport } from './moderatorTypes';

type Accent = 'rose' | 'sky' | 'violet' | 'emerald' | 'amber';

type Handler = { id: string | number; name: string; role?: string };

const ACCENT_LABEL: Record<string, string> = {
  violet: 'text-violet-400',
  sky: 'text-sky-400',
  amber: 'text-amber-400',
  emerald: 'text-emerald-400',
  rose: 'text-rose-400',
};

function overviewPathFor(endpointBase: string) {
  return endpointBase.replace(/\/reports\/?$/, '/overview');
}

function workloadHandlers(body: { data?: { staffWorkload?: unknown } } | undefined): Handler[] {
  const workload = body?.data?.staffWorkload || [];
  if (!Array.isArray(workload)) return [];
  return workload.map((s: { staffId: string | number; name: string; role?: string }) => ({
    id: s.staffId,
    name: s.name,
    role: s.role,
  }));
}

/** Shared specialist/support Reports page shell around ReportDesk. */
export default function ModeratorReportsPage({
  roleLabel,
  subtitle,
  endpointBase,
  accent,
  deskLabel,
}: {
  roleLabel: string;
  subtitle: string;
  endpointBase: string;
  accent: Accent;
  deskLabel?: string;
}) {
  const [reports, setReports] = useState<UserReport[]>(() => {
    const cached = peekStaffGet(endpointBase);
    return cached?.data?.success ? cached.data.data || [] : [];
  });
  const [handlers, setHandlers] = useState<Handler[]>(() =>
    workloadHandlers(peekStaffGet(overviewPathFor(endpointBase))?.data)
  );
  const [loading, setLoading] = useState(() => !peekStaffGet(endpointBase)?.data?.success);
  const [refreshing, setRefreshing] = useState(false);
  const hasData = useRef(!loading);

  const load = async () => {
    if (hasData.current) setRefreshing(true);
    else setLoading(true);
    const handlersRequest = staffGet(overviewPathFor(endpointBase))
      .then((overview) => {
        const next = workloadHandlers(overview.data);
        if (next.length) setHandlers(next);
      })
      .catch(() => {
        // Overview may not expose workload; assignees still derived from report rows.
      });
    try {
      const res = await staffGet(endpointBase);
      if (res.data?.success) {
        hasData.current = true;
        setReports(res.data.data || []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    await handlersRequest;
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpointBase]);

  return (
    <main
      className="relative z-10 min-h-screen px-6 py-8 md:pl-[260px] md:px-10"
      style={{ animation: 'fadeIn 420ms ease' }}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p
            className={`text-[11px] font-semibold uppercase tracking-wide ${ACCENT_LABEL[accent] || ACCENT_LABEL.sky}`}
          >
            {roleLabel}
          </p>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
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

      <ReportDesk
        reports={reports}
        onUpdated={() => void load()}
        accent={accent}
        endpointBase={endpointBase}
        loading={loading}
        handlers={handlers}
        deskLabel={deskLabel}
      />
    </main>
  );
}
