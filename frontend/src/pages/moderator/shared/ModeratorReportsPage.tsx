import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import ReportDesk, { type ReportDeskPreset } from './ReportDesk';
import type { UserReport } from './moderatorTypes';

type Accent = 'rose' | 'sky' | 'violet' | 'emerald' | 'amber';

type Handler = { id: string | number; name: string; role?: string };

/** Optional queue scopes a desk can switch between (sent as `?scope=`). */
export type ReportScopeOption = { id: string; label: string; hint: string };

const SCOPE_ACTIVE: Record<string, string> = {
  violet: 'bg-violet-500/15 text-violet-100 border-violet-500/30',
  sky: 'bg-sky-500/15 text-sky-100 border-sky-500/30',
  amber: 'bg-amber-500/15 text-amber-100 border-amber-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-100 border-emerald-500/30',
  rose: 'bg-rose-500/15 text-rose-100 border-rose-500/30',
};

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
  scopeOptions,
  listingApiBase,
}: {
  roleLabel: string;
  subtitle: string;
  endpointBase: string;
  accent: Accent;
  deskLabel?: string;
  /** First option is the default and is requested without a `scope` param. */
  scopeOptions?: ReportScopeOption[];
  /** Marketplace API root, so a report case can open the linked listing review. */
  listingApiBase?: string;
}) {
  const [searchParams] = useSearchParams();
  // Dashboard cards deep-link here with ?q= / ?status= / ?priority= / ?assignee=.
  const preset = useMemo<ReportDeskPreset>(
    () => ({
      search: searchParams.get('q'),
      status: searchParams.get('status'),
      priority: searchParams.get('priority'),
      assignee: searchParams.get('assignee'),
    }),
    // Read once on mount; the desk owns its filters after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const defaultScope = scopeOptions?.[0]?.id ?? null;
  const [scope, setScope] = useState<string | null>(defaultScope);
  const paramsFor = (value: string | null) =>
    value && value !== defaultScope ? { scope: value } : undefined;

  const [reports, setReports] = useState<UserReport[]>(() => {
    const cached = peekStaffGet(endpointBase, paramsFor(defaultScope));
    return cached?.data?.success ? cached.data.data || [] : [];
  });
  const [handlers, setHandlers] = useState<Handler[]>(() =>
    workloadHandlers(peekStaffGet(overviewPathFor(endpointBase))?.data)
  );
  const [loading, setLoading] = useState(
    () => !peekStaffGet(endpointBase, paramsFor(defaultScope))?.data?.success
  );
  const [refreshing, setRefreshing] = useState(false);
  const hasData = useRef(!loading);

  const load = async (nextScope: string | null = scope) => {
    const params = paramsFor(nextScope);
    const cached = peekStaffGet(endpointBase, params);
    if (cached?.data?.success) {
      setReports(cached.data.data || []);
      hasData.current = true;
    }
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
      const res = await staffGet(endpointBase, params);
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

  const switchScope = (next: string) => {
    if (next === scope) return;
    setScope(next);
    void load(next);
  };

  const activeScope = scopeOptions?.find((option) => option.id === scope) || null;

  return (
    <main className="min-h-screen md:pl-[260px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p
              className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${ACCENT_LABEL[accent] || ACCENT_LABEL.sky}`}
            >
              {roleLabel}
            </p>
            <h1 className="text-xl font-bold text-white">Reports</h1>
            <p className="mt-1 max-w-3xl text-xs text-zinc-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || refreshing}
            className="flex items-center gap-2 self-start rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:text-white disabled:opacity-50"
          >
            {loading || refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>
      </header>

      <div className="px-6 py-6 md:px-8 md:py-8">
        {scopeOptions && scopeOptions.length > 1 && (
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="inline-flex w-fit rounded-xl border border-white/[0.08] bg-[#0f1016] p-1"
              role="group"
              aria-label="Report scope"
            >
              {scopeOptions.map((option) => {
                const active = option.id === scope;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => switchScope(option.id)}
                    className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition ${
                      active
                        ? SCOPE_ACTIVE[accent] || SCOPE_ACTIVE.sky
                        : 'border-transparent text-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {activeScope && <p className="text-xs text-zinc-500">{activeScope.hint}</p>}
          </div>
        )}

        <ReportDesk
          reports={reports}
          onUpdated={() => void load()}
          accent={accent}
          endpointBase={endpointBase}
          loading={loading}
          handlers={handlers}
          deskLabel={activeScope ? activeScope.label : deskLabel}
          preset={preset}
          listingApiBase={listingApiBase}
        />
      </div>
    </main>
  );
}
