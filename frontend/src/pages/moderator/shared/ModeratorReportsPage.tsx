import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import api from '@/lib/axios';
import ReportDesk from './ReportDesk';
import type { UserReport } from './moderatorTypes';

type Accent = 'rose' | 'sky' | 'violet' | 'emerald' | 'amber';

const ACCENT_LABEL: Record<string, string> = {
  violet: 'text-violet-400',
  sky: 'text-sky-400',
  amber: 'text-amber-400',
  emerald: 'text-emerald-400',
  rose: 'text-rose-400',
};

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
  const [reports, setReports] = useState<UserReport[]>([]);
  const [handlers, setHandlers] = useState<{ id: string | number; name: string; role?: string }[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpointBase);
      if (res.data?.success) setReports(res.data.data || []);

      const overviewPath = endpointBase.replace(/\/reports\/?$/, '/overview');
      try {
        const overview = await api.get(overviewPath);
        const workload = overview.data?.data?.staffWorkload || [];
        if (Array.isArray(workload) && workload.length) {
          setHandlers(
            workload.map((s: { staffId: string | number; name: string; role?: string }) => ({
              id: s.staffId,
              name: s.name,
              role: s.role,
            }))
          );
        }
      } catch {
        // Overview may not expose workload; assignees still derived from report rows.
      }
    } finally {
      setLoading(false);
    }
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
