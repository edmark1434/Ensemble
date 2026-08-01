import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import api from '@/lib/axios';
import DisputeDesk from '../shared/DisputeDesk';
import type { Dispute } from '../shared/moderatorTypes';

export default function JobsDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [handlers, setHandlers] = useState<{ id: string | number; name: string; role: string }[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [disputesRes, overviewRes] = await Promise.all([
        api.get('/api/moderator/jobs/disputes'),
        api.get('/api/moderator/jobs/overview'),
      ]);
      if (disputesRes.data?.success) setDisputes(disputesRes.data.data || []);
      const workload = overviewRes.data?.data?.staffWorkload || [];
      setHandlers(
        workload.map((s: { staffId: string | number; name: string; role: string }) => ({
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
  }, []);

  return (
    <main
      className="relative z-10 min-h-screen px-6 py-8 md:pl-[260px] md:px-10"
      style={{ animation: 'fadeIn 420ms ease' }}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
            Jobs &amp; Gigs Moderator
          </p>
          <h1 className="text-2xl font-bold text-white">Disputes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Job, gig, contract and feedback disputes — workflow status, outcomes, and chat.
          </p>
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
        accent="emerald"
        endpointBase="/api/moderator/jobs/disputes"
        deskMode
        deskLabel="Jobs"
        loading={loading}
      />
    </main>
  );
}
