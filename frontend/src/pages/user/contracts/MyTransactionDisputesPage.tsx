import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Check, Plus } from "lucide-react";
import api from "@/lib/axios";
import UserHeader from "@/components/nav/user_header";
import { casePath, useCaseEvents, type CaseAccess } from "@/lib/cases";
import {
  Card,
  DisputeDecisionCard,
  DisputeSettlementCard,
  StatusPill,
  VisibilityPill,
  formatWhen,
  isClosedStatus,
  isDisputeDecision,
  parseDisputeRuling,
} from "@/pages/user/disputes/disputeUi";
import type {
  DisputeSettlement,
  MentionMap,
  ViewerRole,
} from "@/pages/user/disputes/disputeUi";

/**
 * Contract disputes at a glance: progress, the ruling and the payout. The conversation (notes
 * for staff, replies) lives in Cases (`/support/cases?dispute=`), so there is one place to
 * talk about a case and it follows the same rules for every member, penalised or not.
 */
type DisputeMessage = {
  id: string;
  authorType?: string;
  authorRole?: string | null;
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
  viewerRole?: ViewerRole;
  updatedAt?: string;
  /** A private case shown to the disputee only because a money ruling touched them. */
  limited?: boolean;
  contractTitle?: string | null;
  outcomeLabel?: string | null;
  /** What the member may do on it, from the server. */
  access?: CaseAccess;
};

function isTransactionDispute(row: DisputeRow) {
  const type = String(row.type || "").toLowerCase();
  return type === "contract" || type === "transaction";
}

function isOpen(row: DisputeRow) {
  return !isClosedStatus(row.status);
}

function DisputeProgress({ dispute }: { dispute: DisputeRow }) {
  const closed = !isOpen(dispute);
  const isPublic = Boolean(dispute.visibility);
  const steps =
    closed && !isPublic
      ? ["Filed", "Staff review", "Closed"]
      : ["Filed", "Staff review", "Public discussion", "Closed"];
  const current = closed ? steps.length - 1 : isPublic ? 2 : 1;

  return (
    <ol className="flex items-center gap-1.5">
      {steps.map((step, index) => {
        const done = index < current || (closed && index === current);
        const active = index === current && !closed;
        return (
          <li key={step} className="flex min-w-0 flex-1 items-center gap-1.5">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                done
                  ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                  : active
                    ? "border-rose-500 text-rose-600 dark:border-rose-400 dark:text-rose-300"
                    : "border-gray-300 text-gray-400 dark:border-white/15 dark:text-zinc-500"
              }`}
            >
              {done ? <Check className="h-3 w-3" strokeWidth={3} /> : index + 1}
            </span>
            <span
              className={`truncate text-[11px] ${
                active
                  ? "font-semibold text-gray-900 dark:text-white"
                  : done
                    ? "text-gray-600 dark:text-zinc-300"
                    : "text-gray-400 dark:text-zinc-500"
              }`}
            >
              {step}
            </span>
            {index < steps.length - 1 ? (
              <span className={`h-px min-w-3 flex-1 ${done ? "bg-gray-400 dark:bg-zinc-500" : "bg-gray-200 dark:bg-white/10"}`} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function DisputeCard({ dispute }: { dispute: DisputeRow }) {
  const open = isOpen(dispute);
  const publicDiscussion = Boolean(dispute.visibility);
  const [settlement, setSettlement] = useState<DisputeSettlement | null>(null);
  const [latestRuling, setLatestRuling] = useState<DisputeMessage | null>(null);
  /** "@handle" → account id, so mentions in rulings link to profiles. */
  const [mentions, setMentions] = useState<MentionMap>({});

  // Once closed: the ruling and any payout. The conversation itself lives in Cases.
  // `updatedAt` moves on every live update, so a ruling or payout made elsewhere shows here.
  useEffect(() => {
    if (open) return;
    let cancelled = false;
    api.get(`/api/users/disputes/${dispute.id}`)
      .then((res) => {
        if (cancelled) return;
        const messages: DisputeMessage[] = Array.isArray(res.data?.data?.messages) ? res.data.data.messages : [];
        setMentions(res.data?.data?.mentions || {});
        setSettlement(res.data?.data?.settlement || null);
        // The filing summary and the "now public" invite are platform notices, not rulings.
        setLatestRuling(
          [...messages]
            .reverse()
            .find((message) => isDisputeDecision(message) && parseDisputeRuling(message.body).kind !== "notice") || null
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [dispute.id, dispute.updatedAt, open]);

  const attention = open ? dispute.access?.attention || null : null;
  const canReply = Boolean(dispute.access?.canReply);

  return (
    <Card className="overflow-hidden">
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-zinc-400">
          <span className="font-semibold">{dispute.number || "Dispute"}</span>
          <span className="text-gray-300 dark:text-zinc-600">·</span>
          <span>
            {dispute.filedByMe
              ? "Filed by you"
              : dispute.limited
                ? "Decided by staff — you are the other party"
                : "You are named in this dispute"}
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <VisibilityPill isPublic={publicDiscussion} />
            <StatusPill status={dispute.status} />
          </span>
        </div>

        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {dispute.title || "Transaction dispute"}
          </h3>
          {dispute.reason && dispute.reason !== dispute.title ? (
            <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-zinc-400">
              {dispute.reason}
            </p>
          ) : null}
          {dispute.limited ? (
            <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
              The other party filed a private dispute
              {dispute.contractTitle ? ` about your contract “${dispute.contractTitle}”` : " about your contract"}.
              Staff ruled on it{dispute.outcomeLabel ? ` (${dispute.outcomeLabel.toLowerCase()})` : ""}, and it
              affects your credits, so you can see the outcome here. The complaint and its discussion stay
              private. Contact Support if you want to appeal.
            </p>
          ) : null}
        </div>

        <DisputeProgress dispute={dispute} />

        {attention ? (
          <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-900 dark:text-amber-100">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {attention}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-white/5">
          <span className="text-[11px] text-gray-500 dark:text-zinc-500">
            {dispute.access?.stageLabel ? `${dispute.access.stageLabel} · ` : ""}
            Updated {formatWhen(dispute.updatedAt, false) || "—"}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            {publicDiscussion ? (
              <Link
                to={`/disputes/${dispute.id}`}
                className="rounded-xl border border-gray-200 px-3.5 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
              >
                Public page
              </Link>
            ) : null}
            {dispute.limited ? (
              <span className="text-xs text-gray-500 dark:text-zinc-500">Decided privately</span>
            ) : (
              <Link
                to={casePath("dispute", dispute.id)}
                className="rounded-xl bg-gray-900 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-200"
              >
                {open && canReply ? (dispute.filedByMe && !publicDiscussion ? "Add information" : "Reply") : "View conversation"}
              </Link>
            )}
          </span>
        </div>
      </div>

      {!open && (settlement || (latestRuling && !publicDiscussion)) ? (
        <section className="space-y-3 border-t border-gray-100 p-5 dark:border-white/5">
          {latestRuling && !publicDiscussion ? (
            <DisputeDecisionCard
              body={latestRuling.body}
              when={formatWhen(latestRuling.createdAt)}
              mentions={mentions}
            />
          ) : null}
          <DisputeSettlementCard settlement={settlement} />
        </section>
      ) : null}
    </Card>
  );
}

export default function MyTransactionDisputesPage() {
  const [rows, setRows] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "closed">("active");

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

  // Staff decisions and replies land here without a reload: resolved, reopened, made public,
  // closed, parties swapped, payouts, "waiting for you". The list is read back from the server,
  // because a swap changes who filed the case (and whether this member may still see it).
  const refetchTimer = useRef<number | undefined>(undefined);
  const scheduleRefetch = useCallback(() => {
    window.clearTimeout(refetchTimer.current);
    refetchTimer.current = window.setTimeout(() => {
      api
        .get("/api/users/disputes")
        // Each change moves the case's updatedAt, so its card re-reads the ruling and payouts.
        .then((res) => setRows(Array.isArray(res.data?.data) ? res.data.data : []))
        .catch(() => undefined);
    }, 250);
  }, []);
  useEffect(() => () => window.clearTimeout(refetchTimer.current), []);
  useCaseEvents(scheduleRefetch);

  const transactionDisputes = rows.filter(isTransactionDispute);
  const active = transactionDisputes.filter(isOpen);
  const closed = transactionDisputes.filter((row) => !isOpen(row));
  const shown = tab === "active" ? active : closed;

  return (
    <div className="min-h-screen bg-gray-50 font-['Plus_Jakarta_Sans'] dark:bg-dark-base">
      <UserHeader pageTitle="Disputes" />
      <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8" data-tour="disputes-container">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transaction disputes</h1>
            <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-zinc-400">
              Disputes you filed, and disputes that name you once staff make them public. Opening a dispute freezes the remaining escrow.
              Notes for staff and replies are in{" "}
              <Link to="/support/cases" className="font-semibold text-gray-700 hover:underline dark:text-zinc-200">
                Cases
              </Link>
              .
            </p>
          </div>
          <Link
            to="/contracts/dispute-form"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Report a dispute
          </Link>
        </div>

        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 dark:border-white/10 dark:bg-dark-surface">
          {([
            ["active", `Active (${active.length})`],
            ["closed", `Closed (${closed.length})`],
          ] as const).map(([key, text]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                tab === key
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              {text}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-40 rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface" />
            <div className="h-40 rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface" />
          </div>
        ) : error ? (
          <Card className="px-6 py-8 text-center">
            <AlertCircle className="mx-auto h-6 w-6 text-red-500" />
            <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>
          </Card>
        ) : shown.length === 0 ? (
          <Card className="px-6 py-10 text-center">
            <AlertCircle className="mx-auto h-6 w-6 text-gray-400 dark:text-zinc-500" />
            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
              {tab === "active" ? "No active transaction disputes" : "No closed disputes yet"}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
              {tab === "active"
                ? "Open disputes appear here until staff close them."
                : "Disputes move here once they are closed."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {shown.map((dispute) => (
              <DisputeCard key={dispute.id} dispute={dispute} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
