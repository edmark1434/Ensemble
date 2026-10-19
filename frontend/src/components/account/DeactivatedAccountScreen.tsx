import { useEffect, useState } from "react";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${hours}h ${minutes}m ${seconds}s`;
}

export default function DeactivatedAccountScreen() {
  const user = useGlobalState((state) => state.user);
  const availableAt = user?.restriction?.reactivationAvailableAt
    ? new Date(user.restriction.reactivationAvailableAt)
    : null;
  const [now, setNow] = useState(() => Date.now());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = availableAt ? Math.max(0, availableAt.getTime() - now) : 0;
  const ready = remaining <= 0;

  const reactivate = async () => {
    if (!ready || pending) return;
    setPending(true);
    setError("");
    try {
      const response = await api.post("/api/accounts/reactivate");
      const current = useGlobalState.getState().user;
      useGlobalState.getState().setUser({
        ...current,
        status: "Active",
        restriction: response.data?.restriction || { ...current?.restriction, deactivated: false },
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Reactivation is not available yet.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-gray-900 dark:bg-dark-base dark:text-white">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-white/10 dark:bg-dark-surface">
        <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          Deactivated
        </span>
        <p className="mt-4 text-sm text-gray-600 dark:text-zinc-400">
          Your profile is hidden from search and from other members. Staff can still open it. This screen stays up until reactivation is available.
        </p>
        <ul className="mt-4 space-y-2 text-left text-sm text-gray-600 dark:text-zinc-400">
          <li>Members cannot find or open your profile.</li>
          <li>Staff and admins can still view it in platform view.</li>
          <li>Reactivate stays locked for 72 hours from the moment you turned the account off.</li>
        </ul>
        <p className="mt-3 text-sm font-medium text-gray-900 dark:text-zinc-200">
          {ready
            ? "Reactivation is available."
            : `Reactivation unlocks in ${formatRemaining(remaining)}.`}
        </p>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        <button
          type="button"
          onClick={reactivate}
          disabled={!ready || pending}
          className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:disabled:bg-zinc-700"
        >
          {pending ? "Reactivating..." : "Reactivate"}
        </button>
      </div>
    </div>
  );
}
