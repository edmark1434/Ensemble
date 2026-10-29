import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Loader2, Scale } from "lucide-react";
import api from "@/lib/axios";
import UserHeader from "@/components/nav/user_header";
import toast from "react-hot-toast";

type DisputeMessage = {
  id: string;
  authorName?: string;
  body?: string;
  createdAt?: string | null;
};

type DisputeRow = {
  id: string;
  number?: string;
  title?: string;
  type?: string;
  status?: string;
  reason?: string;
  visibility?: boolean;
  filedByMe?: boolean;
  canAddInformation?: boolean;
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

function when(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function DisputeCard({ dispute }: { dispute: DisputeRow }) {
  const open = isOpen(dispute);
  const publicDiscussion = Boolean(dispute.visibility);
  const [notes, setNotes] = useState<DisputeMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(Boolean(dispute.canAddInformation));

  useEffect(() => {
    if (!dispute.canAddInformation) return;
    let cancelled = false;
    api.get(`/api/users/disputes/${dispute.id}`)
      .then((res) => {
        if (!cancelled) setNotes(Array.isArray(res.data?.data?.messages) ? res.data.data.messages : []);
      })
      .catch(() => {
        if (!cancelled) setNotes([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingNotes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dispute.canAddInformation, dispute.id]);

  const sendMoreInformation = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/api/accounts/disputes/${dispute.id}/messages`, { body: draft.trim() });
      setDraft("");
      toast.success("Sent to staff. The other party cannot see this yet.");
      const res = await api.get(`/api/users/disputes/${dispute.id}`);
      setNotes(Array.isArray(res.data?.data?.messages) ? res.data.data.messages : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not send that information.");
    } finally {
      setSending(false);
    }
  };

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
          <span className="font-semibold text-rose-700 dark:text-rose-300">
            {dispute.filedByMe ? "Waiting for staff to open this dispute" : "Waiting for staff"}
          </span>
        ) : (
          <span>Closed before it was made public</span>
        )}
      </div>

      {dispute.canAddInformation ? (
        <section className="mt-4 space-y-3 rounded-xl border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-500/30 dark:bg-rose-500/10">
          <p className="text-xs font-semibold text-rose-900 dark:text-rose-100">Add more information for staff</p>
          <p className="text-[11px] text-rose-800 dark:text-rose-200">
            The other party cannot see or reply until staff make this dispute public. Escrow stays frozen.
          </p>
          {loadingNotes ? (
            <p className="text-xs text-zinc-500">Loading your notes…</p>
          ) : notes.length > 0 ? (
            <div className="space-y-2">
              {notes.map((message) => (
                <div key={message.id} className="rounded-lg border border-rose-200/80 bg-white px-3 py-2 dark:border-rose-500/20 dark:bg-dark-base/40">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
                    <span>{message.authorName || "You"}</span>
                    <span>{when(message.createdAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{message.body}</p>
                </div>
              ))}
            </div>
          ) : null}
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Add evidence, dates, or anything else staff should know"
            className="w-full resize-none rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none dark:border-rose-500/30 dark:bg-dark-base/60"
          />
          <button
            type="button"
            onClick={() => void sendMoreInformation()}
            disabled={sending || !draft.trim()}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send to staff"}
          </button>
        </section>
      ) : null}
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
              Contract and transaction disputes you filed, and disputes that name you after staff open them. Opening a dispute freezes remaining escrow.
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
