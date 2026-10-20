import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Loader2, Scale } from "lucide-react";
import api from "@/lib/axios";
import UserHeader from "@/components/nav/user_header";

type DisputeRow = {
  id: string;
  number?: string;
  title?: string;
  type?: string;
  status?: string;
  reason?: string;
  visibility?: boolean;
  updatedAt?: string;
};

function isTransactionDispute(row: DisputeRow) {
  const type = String(row.type || "").toLowerCase();
  return type === "contract" || type === "transaction";
}

function isOpen(row: DisputeRow) {
  return String(row.status || "").toLowerCase() !== "closed";
}

function label(value?: string) {
  return String(value || "Open")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function when(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function DisputeCard({ dispute }: { dispute: DisputeRow }) {
  const open = isOpen(dispute);
  const publicDiscussion = Boolean(dispute.visibility);
  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-xs dark:bg-dark-surface/40 ${
      open
        ? "border-rose-300 dark:border-rose-500/40"
        : "border-zinc-200 dark:border-white/10"
    }`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">{dispute.number || "Dispute"}</p>
          <h2 className="mt-1 text-base font-bold text-zinc-900 dark:text-white">{dispute.title || "Transaction dispute"}</h2>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
          open
            ? "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200"
            : "border-zinc-200 text-zinc-600 dark:border-white/10 dark:text-zinc-300"
        }`}>
          {open ? "Active" : label(dispute.status)}
        </span>
      </div>
      {dispute.reason ? (
        <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">{dispute.reason}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <span>{when(dispute.updatedAt)}</span>
        {publicDiscussion ? (
          <Link
            to={`/disputes/${dispute.id}`}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700"
          >
            View dispute
          </Link>
        ) : open ? (
          <span className="font-semibold text-rose-700 dark:text-rose-300">Waiting for staff to open this dispute</span>
        ) : (
          <span>Closed before it was made public</span>
        )}
      </div>
    </article>
  );
}

export default function MyTransactionDisputesPage() {
  const [rows, setRows] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get("/api/users/disputes")
      .then((res) => {
        if (!cancelled) setRows(Array.isArray(res.data?.data) ? res.data.data : []);
      })
      .catch(() => {
        if (!cancelled) setError("Your disputes could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const transactionDisputes = rows.filter(isTransactionDispute);
  const active = transactionDisputes.filter(isOpen);
  const closed = transactionDisputes.filter((row) => !isOpen(row));

  return (
    <div className="min-h-screen bg-gray-50 font-['Plus_Jakarta_Sans'] dark:bg-dark-base">
      <UserHeader pageTitle="Disputes" />
      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8" data-tour="disputes-container">
        <div className="flex items-start gap-3">
          <Scale className="mt-1 h-5 w-5 text-zinc-500" />
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Transaction disputes</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Contract disputes you filed, and disputes that name you after staff open them.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading disputes…
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}

        {!loading && !error ? (
          <>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Active ({active.length})</h2>
              {active.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-white/10 dark:bg-dark-surface/40">
                  <AlertCircle className="mx-auto h-6 w-6 text-zinc-400" />
                  <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">No active transaction disputes</p>
                  <p className="mt-1 text-xs text-zinc-500">Open ones appear here until they are closed.</p>
                  <Link to="/contracts/dispute-form" className="mt-3 inline-block text-sm font-semibold text-red-600 hover:underline dark:text-red-400">
                    Report a dispute
                  </Link>
                </div>
              ) : (
                active.map((dispute) => <DisputeCard key={dispute.id} dispute={dispute} />)
              )}
            </section>

            {closed.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Closed ({closed.length})</h2>
                {closed.map((dispute) => <DisputeCard key={dispute.id} dispute={dispute} />)}
              </section>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
