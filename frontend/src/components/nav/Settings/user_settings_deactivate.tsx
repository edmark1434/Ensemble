import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Clock, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";
import { formatStandingWhen } from "@/lib/standing";

type DeactivationState = {
  deactivated: boolean;
  cooldownHours: number;
  redeactivateCooldownDays: number;
  deactivationAvailableAt: string | null;
  deactivationReady: boolean;
  canDeactivate: boolean;
  standingBlocksDeactivation: boolean;
  blockers: { liveContracts: number; openDisputes: number } | null;
};

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function UserSettingsDeactivate() {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<DeactivationState | null>(null);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await api.get("/api/accounts/deactivation");
      setState(response.data?.deactivation || null);
      setLoadError("");
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || "Could not load deactivation settings.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cooldownHours = state?.cooldownHours ?? 72;
  const redeactivateDays = state?.redeactivateCooldownDays ?? 7;

  const effects = [
    "You leave the rest of Ensemble. The only controls left are Reactivate and Sign out.",
    "Other members cannot search for you, open your profile, follow you, message you, or send you proposals, offers or orders.",
    "Your open jobs and gigs drop out of browse until you come back. Nothing is deleted.",
    "Staff and admins can still search and open your profile, including in platform view.",
    `Reactivation stays locked for ${cooldownHours} hours. A countdown shows how long is left.`,
    `After you reactivate, you have to wait ${redeactivateDays} days before you can deactivate again.`,
  ];

  const deactivate = async () => {
    if (pending) return;
    setPending(true);
    try {
      const response = await api.post("/api/accounts/deactivate");
      const current = useGlobalState.getState().user;
      toast.success(`Account deactivated. Reactivation unlocks in ${cooldownHours} hours.`);
      useGlobalState.getState().setUser({
        ...current,
        status: "Deactivated",
        restriction: response.data?.restriction,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not deactivate this account.");
      if (err?.response?.data?.deactivation) setState(err.response.data.deactivation);
      setConfirming(false);
      setPending(false);
    }
  };

  const blockers = state?.blockers;
  const blocked = Boolean(blockers && (blockers.liveContracts || blockers.openDisputes));
  const inCooldown = Boolean(state && !state.deactivationReady && state.deactivationAvailableAt);
  const canDeactivate = Boolean(state?.canDeactivate);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Deactivate account</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
          Hide your profile from members. You can turn it back on after {cooldownHours} hours.
        </p>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">What happens if you deactivate</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-zinc-300">
              {effects.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {loadError && <p className="text-sm text-red-500">{loadError}</p>}
      {!state && !loadError && (
        <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking whether you can deactivate…
        </p>
      )}

      {inCooldown && (
        <div className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 text-sm text-gray-700 dark:border-white/10 dark:text-zinc-300">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
          <p>
            You reactivated recently. You can deactivate again on{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{formatStandingWhen(state?.deactivationAvailableAt)}</span>.
          </p>
        </div>
      )}

      {state?.standingBlocksDeactivation && (
        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-700 dark:border-white/10 dark:text-zinc-300">
          A suspension, lock or ban is on this account. You can deactivate once it ends.
        </div>
      )}

      {blocked && blockers && (
        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-700 dark:border-white/10 dark:text-zinc-300">
          <p className="font-semibold text-gray-900 dark:text-white">Finish these first</p>
          <p className="mt-1">
            Other people are waiting on you. Deactivating now would leave their work and credits stuck.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {blockers.liveContracts > 0 && (
              <li>{plural(blockers.liveContracts, "contract")} still running or waiting on a signature</li>
            )}
            {blockers.openDisputes > 0 && <li>{plural(blockers.openDisputes, "open dispute")}</li>}
          </ul>
        </div>
      )}

      {confirming ? (
        <div className="rounded-xl border border-gray-200 p-5 dark:border-white/10">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Reminder before you continue</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
            Deactivation starts immediately. The Reactivate button stays off for {cooldownHours} hours, and the screen shows the time remaining. Once you reactivate, you cannot deactivate again for {redeactivateDays} days. Staff can still view this account.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !canDeactivate}
              onClick={deactivate}
              className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-60"
            >
              {pending ? "Deactivating..." : "Deactivate"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 dark:border-white/10 dark:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!canDeactivate}
          onClick={() => setConfirming(true)}
          className="rounded-xl border border-amber-500/40 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-300"
        >
          Deactivate account
        </button>
      )}
    </div>
  );
}
