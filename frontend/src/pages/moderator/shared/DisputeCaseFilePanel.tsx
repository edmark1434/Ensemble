import type { ReactNode } from "react";
import type {
  Dispute,
  DisputeCaseFile,
  DisputeCaseTransaction,
  DisputePayout,
  DisputePayoutState,
} from "./moderatorTypes";
import { DisputePayoutsList } from "./DisputePayoutUi";

function when(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function titleCase(value?: string | null) {
  return String(value || "—")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function person(name?: string, handle?: string | null) {
  if (handle && handle !== "—") return `${name || "Unknown"} (@${handle})`;
  return name || "Unknown";
}

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {title}
        {typeof count === "number" && (
          <span className="rounded-full bg-white/5 px-1.5 py-px text-[10px] font-medium text-zinc-400">{count}</span>
        )}
      </h4>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-xs text-zinc-500">{children}</p>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-zinc-200">{value}</dd>
    </div>
  );
}

function Tag({ children, className = "border-white/10 text-zinc-400" }: { children: ReactNode; className?: string }) {
  return <span className={`rounded border px-1.5 py-px text-[10px] ${className}`}>{children}</span>;
}

function TransactionRow({
  tx,
  canReverse,
  showRoute,
  saving,
  onReverse,
}: {
  tx: DisputeCaseTransaction;
  canReverse: boolean;
  showRoute: boolean;
  saving: boolean;
  onReverse?: () => void;
}) {
  const route = tx.reversal;
  const to = route?.toHandle ? `@${route.toHandle}` : route?.toName;
  return (
    <li className="rounded-lg border border-white/10 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-zinc-200">
          {titleCase(tx.type)} · <span className="tabular-nums">{tx.amount.toLocaleString()}</span> credits
        </span>
        <span className="text-[11px] text-zinc-500">{when(tx.createdAt)}</span>
      </div>
      <p className="mt-1 text-xs text-zinc-400">
        {tx.sourceName}
        {tx.sourceHandle ? ` (@${tx.sourceHandle})` : ""} · {tx.sourceWallet} → {tx.destinationName}
        {tx.destinationHandle ? ` (@${tx.destinationHandle})` : ""} · {tx.destinationWallet}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Tag>{titleCase(tx.status)}</Tag>
        {tx.referenceLabel ? <Tag>{tx.referenceLabel}</Tag> : null}
        {tx.tiedToThisDispute ? <Tag className="border-rose-500/30 text-rose-200">This dispute</Tag> : null}
        {tx.reversesTransactionId ? <Tag className="border-amber-500/30 text-amber-200">Compensating reverse</Tag> : null}
        {tx.reversedByTransactionId ? <Tag className="border-amber-500/30 text-amber-200">Already reversed</Tag> : null}
        {tx.reversalScheduled ? <Tag className="border-sky-500/30 text-sky-200">Reversal scheduled</Tag> : null}
        {canReverse ? (
          <button
            type="button"
            disabled={saving}
            onClick={onReverse}
            title={to ? `Takes the credits back and pays ${to}` : undefined}
            className="ml-auto rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-100 hover:bg-red-500/20 disabled:opacity-50"
          >
            Reverse{to ? ` → ${to}` : ""}
          </button>
        ) : null}
      </div>
      {showRoute && !canReverse && route?.reason && tx.status === "Completed" && !tx.reversesTransactionId ? (
        <p className="mt-1.5 text-[11px] text-zinc-500">{route.reason}</p>
      ) : null}
    </li>
  );
}

export default function DisputeCaseFilePanel({
  dispute,
  caseFile,
  onOpenDispute,
  canAct = false,
  saving = false,
  onReverseTransaction,
  payouts = [],
  payoutState,
}: {
  dispute: Dispute;
  caseFile?: DisputeCaseFile;
  onOpenDispute?: (disputeId: string) => void;
  canAct?: boolean;
  saving?: boolean;
  onReverseTransaction?: (tx: DisputeCaseTransaction) => void;
  payouts?: DisputePayout[];
  payoutState?: DisputePayoutState;
}) {
  const contracts = caseFile?.contracts || [];
  const transactions = caseFile?.transactions || [];
  const related = caseFile?.relatedDisputes || [];
  const financial = dispute.financialResolution;
  const ownTransactions = transactions.filter((tx) => tx.inDisputeScope !== false);
  const otherTransactions = transactions.filter((tx) => tx.inDisputeScope === false);

  return (
    <div className="space-y-6">
      <Section title="Parties">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-300/80">Disputer</p>
            <p className="mt-1 text-sm text-white">{person(dispute.initiator.name, dispute.initiator.username)}</p>
            <p className="text-xs text-zinc-500">Filed this dispute</p>
          </div>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300/80">Disputee</p>
            <p className="mt-1 text-sm text-white">{person(dispute.respondent.name, dispute.respondent.username)}</p>
            <p className="text-xs text-zinc-500">Named in this dispute</p>
          </div>
        </div>
      </Section>

      <Section title="Summary">
        <dl className="grid gap-2 sm:grid-cols-3">
          <Fact label="Credits involved" value={dispute.creditAmount.toLocaleString()} />
          <Fact label="Priority" value={titleCase(dispute.priority)} />
          <Fact label="Sanction" value={dispute.sanctionType ? titleCase(dispute.sanctionType) : "None"} />
          <Fact label="Opened" value={when(dispute.openedAt)} />
          <Fact label="Updated" value={when(dispute.updatedAt)} />
          <Fact label="Resolved" value={when(dispute.resolvedAt)} />
        </dl>
        {dispute.resolutionNotes ? (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Resolution notes</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-300">{dispute.resolutionNotes}</p>
          </div>
        ) : null}
      </Section>

      {financial || payouts.length ? (
        <Section title="Money ruling">
          {financial ? (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-100">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/80">
                {financial.kind === "escrow_settle"
                  ? "Escrow settled"
                  : financial.kind === "transaction_reverse"
                    ? "Transaction reversed"
                    : titleCase(financial.kind || "Resolved")}
              </p>
              <p className="mt-0.5">
                {financial.kind === "escrow_settle"
                  ? `Client ${financial.clientCredits.toLocaleString()} · freelancer ${financial.freelancerCredits.toLocaleString()} credits`
                  : financial.kind === "transaction_reverse"
                    ? `${(financial.clientCredits + financial.freelancerCredits).toLocaleString()} credits taken back`
                    : null}
              </p>
              <p className="mt-0.5 text-xs text-emerald-200/70">Ruled {when(financial.at)}</p>
            </div>
          ) : (
            <Empty>The earlier money ruling was withdrawn. The case can be decided again.</Empty>
          )}
          {payouts.length ? (
            // Read-only here; the sidebar Payouts panel holds the actions.
            <DisputePayoutsList payouts={payouts} state={payoutState} canAct={false} saving={saving} />
          ) : null}
        </Section>
      ) : null}

      <Section title="Contracts" count={contracts.length}>
        {contracts.length === 0 ? (
          <Empty>No contract between these accounts is on file.</Empty>
        ) : (
          contracts.map((contract) => (
            <article key={contract.id} className="space-y-2 rounded-xl border border-white/10 px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-white">
                    {contract.title}
                    {contract.linked && <Tag className="border-rose-500/30 text-rose-200">Linked to this dispute</Tag>}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {titleCase(contract.contractType)} · {titleCase(contract.paymentType)} · {titleCase(contract.status)}
                  </p>
                </div>
                <p className="text-sm tabular-nums text-zinc-200">{contract.rateCredits.toLocaleString()} credits</p>
              </div>
              <p className="text-xs text-zinc-400">
                Client {person(contract.clientName, contract.clientHandle)} · Freelancer{" "}
                {person(contract.freelancerName, contract.freelancerHandle)}
              </p>
              <p className="text-[11px] text-zinc-500">
                Starts {when(contract.startsAt)} · Deadline {when(contract.deadlineAt)} · Revision{" "}
                {contract.revisionPriceCredits.toLocaleString()} credits
              </p>
              {contract.milestones.length === 0 ? (
                <p className="text-xs text-zinc-500">No milestones recorded.</p>
              ) : (
                <details className="group rounded-lg border border-white/[0.06]">
                  <summary className="cursor-pointer select-none px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200">
                    Milestones ({contract.milestones.length})
                  </summary>
                  <ul className="space-y-2 border-t border-white/[0.06] p-2">
                    {contract.milestones.map((milestone) => (
                      <li key={milestone.id} className="rounded-lg bg-white/[0.02] px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-200">
                          <span>
                            {milestone.index}. {milestone.name}
                          </span>
                          <span className="text-xs text-zinc-400">
                            {titleCase(milestone.status)} · {milestone.credits.toLocaleString()} credits
                          </span>
                        </div>
                        {milestone.description ? (
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">
                            {milestone.description}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-zinc-500">
                          Started {when(milestone.startedAt)} · Deadline {when(milestone.deadlineAt)} · Revisions{" "}
                          {milestone.revisions}
                        </p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </article>
          ))
        )}
      </Section>

      <Section title="Transactions" count={ownTransactions.length}>
        {ownTransactions.length === 0 ? (
          <Empty>No escrow or contract credit transactions are linked.</Empty>
        ) : (
          <ul className="space-y-2">
            {ownTransactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                canReverse={Boolean(canAct && tx.reversible && onReverseTransaction && !financial)}
                showRoute={canAct && !financial && dispute.status !== "closed"}
                saving={saving}
                onReverse={() => onReverseTransaction?.(tx)}
              />
            ))}
          </ul>
        )}
      </Section>

      {otherTransactions.length ? (
        <Section title="Their other contracts" count={otherTransactions.length}>
          <details className="rounded-lg border border-white/[0.06]">
            <summary className="cursor-pointer select-none px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200">
              Transactions on other contracts between these accounts (context only)
            </summary>
            <ul className="space-y-2 border-t border-white/[0.06] p-2">
              {otherTransactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} canReverse={false} showRoute={false} saving={saving} />
              ))}
            </ul>
          </details>
        </Section>
      ) : null}

      <Section title="Other disputes between them" count={related.length}>
        {related.length === 0 ? (
          <Empty>No other dispute between these two accounts.</Empty>
        ) : (
          <ul className="space-y-2">
            {related.map((item) => {
              const body = (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-white">
                      {item.number || "Dispute"} · {item.title}
                    </span>
                    <span className="text-[11px] text-zinc-500">{when(item.openedAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    {person(item.initiatorName, item.initiatorHandle)} vs {person(item.respondentName, item.respondentHandle)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Tag>{titleCase(item.type)}</Tag>
                    <Tag>{titleCase(item.status)}</Tag>
                    <Tag>{item.creditAmount.toLocaleString()} credits</Tag>
                    <Tag>{item.visibility ? "Public" : "Private"}</Tag>
                  </div>
                  {item.resolutionNotes ? (
                    <p className="mt-1.5 line-clamp-2 text-xs text-zinc-500">Resolution: {item.resolutionNotes}</p>
                  ) : null}
                </>
              );
              if (!onOpenDispute) {
                return (
                  <li key={item.id} className="rounded-lg border border-white/10 px-3 py-2.5">
                    {body}
                  </li>
                );
              }
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onOpenDispute(item.id)}
                    className="w-full rounded-lg border border-white/10 px-3 py-2.5 text-left transition hover:border-white/20 hover:bg-white/[0.03]"
                  >
                    {body}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
