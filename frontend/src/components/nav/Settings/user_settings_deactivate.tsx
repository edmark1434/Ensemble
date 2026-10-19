import { useState } from "react";
import { AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";

const EFFECTS = [
  "You leave the rest of Ensemble. The only control left is Reactivate.",
  "Other members cannot search for you or open your profile.",
  "Staff and admins can still search and open your profile, including in platform view.",
  "Reactivation stays locked for 72 hours. A countdown shows how long is left.",
  "Jobs, messages, and contracts you already have stay in place. People just cannot open your profile from them.",
];

export function UserSettingsDeactivate() {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const deactivate = async () => {
    if (pending) return;
    setPending(true);
    try {
      const response = await api.post("/api/accounts/deactivate");
      const current = useGlobalState.getState().user;
      toast.success("Account deactivated. Reactivation unlocks in 72 hours.");
      useGlobalState.getState().setUser({
        ...current,
        status: "Deactivated",
        restriction: response.data?.restriction,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not deactivate this account.");
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Deactivate account</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
          Hide your profile from members. You can turn it back on after 72 hours.
        </p>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">What happens if you deactivate</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-zinc-300">
              {EFFECTS.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {confirming ? (
        <div className="rounded-xl border border-gray-200 p-5 dark:border-white/10">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Reminder before you continue</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
            Deactivation starts immediately. The Reactivate button stays off for 72 hours, and the screen shows the time remaining. Staff can still view this account.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
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
          onClick={() => setConfirming(true)}
          className="rounded-xl border border-amber-500/40 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
        >
          Deactivate account
        </button>
      )}
    </div>
  );
}
