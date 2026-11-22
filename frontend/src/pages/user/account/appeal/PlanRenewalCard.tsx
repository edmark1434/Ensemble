import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';

/**
 * Paid plan on the appeal page. A banned, locked, suspended or deactivated member can always
 * see their plan and stop it from renewing (backend allowlists `/api/subscription/plan-details`
 * and `/api/payment/cancel-subscription` for every standing). A permanent ban stops renewal on
 * its own. Shows nothing for the Free plan.
 */

type PlanDetails = {
  plan_name?: string | null;
  price?: number | string | null;
  renews_at?: string | null;
  cancel_at_period_end?: boolean | null;
  xendit_plan_id?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function PlanRenewalCard({ className = '' }: { className?: string }) {
  const [plan, setPlan] = useState<PlanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/subscription/plan-details');
      const details = res.data?.planDetails;
      setPlan(Array.isArray(details) ? details[0] || null : details || null);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const paid = plan && Number(plan.price || 0) > 0;
  if (loading || !paid) return null;

  const until = formatDate(plan.renews_at);
  const stopped = Boolean(plan.cancel_at_period_end);

  const stopRenewal = async () => {
    setBusy(true);
    try {
      const res = await api.post('/api/payment/cancel-subscription');
      showSuccessToast(res.data?.message || 'Your plan will not renew.');
      setConfirming(false);
      await load();
    } catch (err: any) {
      showErrorToast(err?.response?.data?.error || err?.response?.data?.message || 'Could not stop the renewal. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-dark-surface ${className}`}>
      <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">
        <CreditCard className="h-3.5 w-3.5" /> Your plan
      </h2>
      <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{plan.plan_name || 'Paid plan'}</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-zinc-400">
        {stopped
          ? `It will not renew${until ? `; it ends on ${until}` : ''}.`
          : `It renews${until ? ` on ${until}` : ' automatically'}. You can stop the renewal at any time, whatever happens with your appeal.`}
      </p>
      {!stopped ? (
        confirming ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void stopRenewal()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Stop renewal
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
            >
              Keep it
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-3 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
          >
            Stop renewal
          </button>
        )
      ) : null}
    </section>
  );
}
