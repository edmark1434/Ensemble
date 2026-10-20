import type { Dispute, DisputeCaseFile } from "./moderatorTypes";

function when(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
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

export default function DisputeCaseFilePanel({
  dispute,
  caseFile,
  onOpenDispute,
}: {
  dispute: Dispute;
  caseFile?: DisputeCaseFile;
  onOpenDispute?: (disputeId: string) => void;
}) {
  const contracts = caseFile?.contracts || [];
  const transactions = caseFile?.transactions || [];
  const related = caseFile?.relatedDisputes || [];

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Case file</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Parties, contract record, credit movements, and other disputes between these accounts.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Disputer</p>
          <p className="mt-1 text-sm text-white">{person(dispute.initiator.name, dispute.initiator.username)}</p>
          <p className="text-xs text-zinc-500">Filed this dispute</p>
        </div>
        <div className="rounded-xl border border-white/10 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Disputee</p>
          <p className="mt-1 text-sm text-white">{person(dispute.respondent.name, dispute.respondent.username)}</p>
          <p className="text-xs text-zinc-500">Named in this dispute</p>
        </div>
      </div>

      <dl className="grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
        <div>Opened {when(dispute.openedAt)}</div>
        <div>Updated {when(dispute.updatedAt)}</div>
        <div>Resolved {when(dispute.resolvedAt)}</div>
        <div>Credits involved {dispute.creditAmount.toLocaleString()}</div>
        <div>Sanction {dispute.sanctionType ? titleCase(dispute.sanctionType) : "None"}</div>
        <div>Priority {titleCase(dispute.priority)}</div>
      </dl>
      {dispute.resolutionNotes ? (
        <p className="whitespace-pre-wrap text-sm text-zinc-300">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Resolution. </span>
          {dispute.resolutionNotes}
        </p>
      ) : null}

      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Contracts</h4>
        {contracts.length === 0 ? (
          <p className="text-sm text-zinc-500">No contract between these accounts is on file.</p>
        ) : (
          contracts.map((contract) => (
            <article key={contract.id} className="space-y-3 rounded-xl border border-white/10 px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">{contract.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {titleCase(contract.contractType)} · {titleCase(contract.paymentType)} · {contract.status}
                    {contract.linked ? " · Linked to this dispute" : ""}
                  </p>
                </div>
                <p className="text-sm text-zinc-200">{contract.rateCredits.toLocaleString()} credits</p>
              </div>
              <p className="text-xs text-zinc-400">
                Client {person(contract.clientName, contract.clientHandle)} · Freelancer{" "}
                {person(contract.freelancerName, contract.freelancerHandle)}
              </p>
              <p className="text-xs text-zinc-500">
                Starts {when(contract.startsAt)} · Deadline {when(contract.deadlineAt)} · Revision price{" "}
                {contract.revisionPriceCredits.toLocaleString()} credits
              </p>
              {contract.milestones.length === 0 ? (
                <p className="text-xs text-zinc-500">No milestones recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {contract.milestones.map((milestone) => (
                    <li key={milestone.id} className="rounded-lg border border-white/10 px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-200">
                        <span>
                          {milestone.index}. {milestone.name}
                        </span>
                        <span>
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
              )}
            </article>
          ))
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Transactions</h4>
        {transactions.length === 0 ? (
          <p className="text-sm text-zinc-500">No escrow or contract credit transactions are linked.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {transactions.map((tx) => (
              <li key={tx.id} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 text-zinc-200">
                  <span>
                    {tx.type} · {tx.amount.toLocaleString()} credits
                  </span>
                  <span className="text-xs text-zinc-500">{when(tx.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  {tx.sourceName}
                  {tx.sourceHandle ? ` (@${tx.sourceHandle})` : ""} · {tx.sourceWallet} → {tx.destinationName}
                  {tx.destinationHandle ? ` (@${tx.destinationHandle})` : ""} · {tx.destinationWallet}
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {titleCase(tx.status)}
                  {tx.referenceLabel ? ` · ${tx.referenceLabel}` : ""}
                  {tx.tiedToThisDispute ? " · Tied to this dispute" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Other disputes</h4>
        {related.length === 0 ? (
          <p className="text-sm text-zinc-500">No other dispute between these two accounts.</p>
        ) : (
          <ul className="space-y-2">
            {related.map((item) => {
              const body = (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-white">{item.number || "Dispute"} · {item.title}</span>
                    <span className="text-xs text-zinc-500">{when(item.openedAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    {person(item.initiatorName, item.initiatorHandle)} vs {person(item.respondentName, item.respondentHandle)}
                    {" · "}
                    {titleCase(item.type)} · {titleCase(item.status)} · {item.creditAmount.toLocaleString()} credits ·{" "}
                    {item.visibility ? "Public" : "Staff only"}
                  </p>
                  {item.description ? (
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-zinc-500">{item.description}</p>
                  ) : null}
                  {item.resolutionNotes ? (
                    <p className="mt-1 text-xs text-zinc-400">Resolution: {item.resolutionNotes}</p>
                  ) : null}
                </>
              );
              if (!onOpenDispute) {
                return (
                  <li key={item.id} className="rounded-lg border border-white/10 px-3 py-2">
                    {body}
                  </li>
                );
              }
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onOpenDispute(item.id)}
                    className="w-full rounded-lg border border-white/10 px-3 py-2 text-left hover:bg-white/[0.04]"
                  >
                    {body}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
