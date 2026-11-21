import { casePath } from "@/lib/cases";

/**
 * The open dispute on a contract, as the contracts API reports it to one viewer.
 *
 * A contract allows one open dispute. Both parties are told it exists so the other side
 * does not file a duplicate, but a private case's id and number reach only the filer.
 */
export type ContractActiveDispute = {
  id: string | null;
  number?: string | null;
  visibility: boolean;
  status?: string;
  viewerRole?: "disputer" | "disputee" | null;
  filedByViewer?: boolean;
};

export type ContractDisputeFilingCode =
  | "DISPUTE_ALREADY_FILED"
  | "DISPUTE_WINDOW_CLOSED"
  | "DISPUTE_PAYOUT_PENDING"
  | "DISPUTE_DECISION_PENDING";

export const CONTRACT_DISPUTE_FILING_CODES: readonly ContractDisputeFilingCode[] = [
  "DISPUTE_ALREADY_FILED",
  "DISPUTE_WINDOW_CLOSED",
  "DISPUTE_PAYOUT_PENDING",
  "DISPUTE_DECISION_PENDING",
];

/**
 * After a dispute closes without a ruling that ends the contract, both parties choose whether to
 * continue it (`dispute_decision` from the contracts API). Continuing needs both; ending needs one;
 * if nobody ends it by `decideBy`, it continues. When one side chose continue and the other has
 * not answered by then, the silent side first gets one extension (`extendedAt` set, `decideBy`
 * moved). The contract stays on hold meanwhile.
 * `viewerSide` is null for someone who can see the contract but cannot decide for either party.
 */
export type ContractDisputeDecision = {
  id: string;
  decideBy: string;
  createdAt?: string;
  /** Set once the silent side was given extra time; `decideBy` is then the final deadline. */
  extendedAt?: string | null;
  viewerSide: "client" | "freelancer" | null;
  viewerChoice: "continue" | "end" | null;
  otherChoice: "continue" | "end" | null;
  dispute?: ContractActiveDispute | null;
  /**
   * Work the freelancer delivered before the question opened that still waits for the client's
   * review. The client approves it or requests a revision before they can end the contract.
   */
  reviewPending?: { id: string; name: string }[];
};

/**
 * An earlier dispute (by either side) whose ruled payout has not been paid yet. Its credits stay
 * held, so no new dispute can be filed on the contract until it is paid. `id` and `number` are
 * null when the viewer cannot open that case.
 */
export type ContractDisputePendingPayout = ContractActiveDispute & {
  payoutStatus: "scheduled" | "failed";
  releaseAt?: string | null;
};

/**
 * Whether this viewer may file a new dispute on a contract (`dispute_filing` from the contracts API).
 * Each side files one dispute per contract, an ended contract can be disputed for 30 days, and no
 * dispute can be filed while an earlier ruling's payout is pending. The server enforces all three;
 * an open dispute is reported separately as `active_dispute`.
 */
export type ContractDisputeFiling = {
  canFile: boolean;
  code?: ContractDisputeFilingCode | null;
  reason?: string | null;
  endedAt?: string | null;
  windowEndsAt?: string | null;
  /** The viewer's own earlier dispute on this contract. */
  previousDispute?: ContractActiveDispute | null;
  /** The dispute whose payout is still pending, when there is one. */
  pendingPayout?: ContractDisputePendingPayout | null;
};

/**
 * A contract during and after a dispute (`dispute_hold` from the contracts API).
 * `since`: when the current hold began. While a dispute is open, or a ruling's payout is still
 * waiting, escrow is frozen and the contract's clock is stopped; when the hold lifts, its
 * deadlines move forward by the time spent on hold.
 * `settlement`: set when an escrow settlement ruling ended the contract (id and number are null
 * when the viewer cannot open that case).
 */
export type ContractDisputeHold = {
  since?: string | null;
  settlement?: (ContractActiveDispute & { endedAt?: string | null }) | null;
};

const ENDED_CONTRACT_STATUSES = ["done", "completed", "closed", "cancelled", "rejected"];

export type ContractHoldState =
  | { kind: "none" }
  /** A dispute on the contract is open. */
  | { kind: "dispute"; since: string | null }
  /** The dispute closed; the parties choose whether to continue (still on hold). */
  | { kind: "decision"; since: string | null; decision: ContractDisputeDecision }
  /** The case is closed but a ruling's payout has not been paid yet. */
  | { kind: "payout"; since: string | null; payout: ContractDisputePendingPayout | null }
  /** An escrow settlement ruling ended the contract. */
  | { kind: "settled"; settlement: NonNullable<ContractDisputeHold["settlement"]>; payout: ContractDisputePendingPayout | null };

/** Where a contract stands with respect to disputes, for banners, badges and the countdown. */
export function contractHoldState(contract: {
  status?: string | null;
  activeDispute?: ContractActiveDispute | null;
  disputeFiling?: ContractDisputeFiling | null;
  disputeHold?: ContractDisputeHold | null;
  disputeDecision?: ContractDisputeDecision | null;
}): ContractHoldState {
  const ended = ENDED_CONTRACT_STATUSES.includes(String(contract.status || "").toLowerCase());
  const payout = contract.disputeFiling?.pendingPayout || null;
  if (ended) {
    const settlement = contract.disputeHold?.settlement;
    return settlement ? { kind: "settled", settlement, payout } : { kind: "none" };
  }
  const since = contract.disputeHold?.since || null;
  if (contract.activeDispute) return { kind: "dispute", since };
  if (payout) return { kind: "payout", since, payout };
  if (contract.disputeDecision) return { kind: "decision", since, decision: contract.disputeDecision };
  return { kind: "none" };
}

function shortDateTime(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Headline and explanation for the continue-or-end prompt, from the viewer's side. */
export function contractDecisionCopy(decision: ContractDisputeDecision): { title: string; body: string } {
  const by = shortDateTime(decision.decideBy);
  const deadline = by ? ` by ${by}` : "";
  const otherParty = decision.viewerSide === "client" ? "The freelancer" : "The client";
  const caseName = capitalizeFirst(disputeName(decision.dispute));
  if (!decision.viewerSide) {
    return {
      title: "Waiting for the parties to decide",
      body: `${caseName} is closed. The client and the freelancer are choosing whether to continue this contract${deadline}.`,
    };
  }
  const extended = Boolean(decision.extendedAt);
  if (decision.viewerChoice === "continue") {
    return {
      title: "You chose to continue",
      body:
        decision.otherChoice === "continue"
          ? "You both chose to continue."
          : extended
            ? `${otherParty} did not answer in time, so they were given until ${by || "the new deadline"}. If they don't end the contract by then, it continues. You can still end it instead.`
            : `Waiting for ${otherParty.toLowerCase()} to answer${deadline}. If they haven't answered by then, they get one extension before the contract continues. You can still end it instead.`,
    };
  }
  if (decision.otherChoice === "continue") {
    return {
      title: extended ? "Extra time to answer" : "Continue this contract?",
      body: `${caseName} is closed and ${otherParty.toLowerCase()} chose to continue. Choose whether to keep working on this contract${deadline}; if you continue too, it resumes right away, or you can end it instead. ${
        extended
          ? "This is your extension: if you don't end it by then, it continues."
          : "If you haven't answered by then, you get one extension before it continues."
      } Deadlines stay paused until then.`,
    };
  }
  return {
    title: "Continue this contract?",
    body: `${caseName} is closed. Choose whether to keep working on this contract${deadline}. If you both continue, it resumes right away; either of you can end it instead. If nobody ends it by then, it continues. Deadlines stay paused until then.`,
  };
}

function capitalizeFirst(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function shortDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

/** "dispute DIS-123456" when the viewer may see the number, else "the dispute". */
function disputeName(dispute?: { number?: string | null } | null): string {
  return dispute?.number ? `dispute ${dispute.number}` : "the dispute";
}

/** One-line explanation of a hold or a settlement for banners and cards. */
export function contractHoldDetail(state: ContractHoldState): string | null {
  if (state.kind === "dispute") {
    const since = shortDate(state.since);
    return `The contract is on hold${since ? ` since ${since}` : ""}: escrow is frozen and every deadline is paused. When the case closes, deadlines move forward by the time spent on hold.`;
  }
  if (state.kind === "payout") {
    const failed = state.payout?.payoutStatus === "failed";
    const date = failed ? null : shortDate(state.payout?.releaseAt);
    return `The ruling on ${disputeName(state.payout)} is waiting to be paid${date ? ` on ${date}` : ""}${
      failed ? " (staff are retrying the payout)" : ""
    }. Until then escrow stays frozen and deadlines stay paused; they move forward by the time spent on hold once it is paid.`;
  }
  if (state.kind === "decision") {
    return "The dispute is closed, and the contract stays on hold until both parties choose whether to continue it. Deadlines are paused and escrow is frozen meanwhile, except that the client can still approve delivered work.";
  }
  if (state.kind === "settled") {
    const ended = shortDate(state.settlement.endedAt);
    const date = state.payout?.payoutStatus === "scheduled" ? shortDate(state.payout?.releaseAt) : null;
    return `This contract was ended${ended ? ` on ${ended}` : ""} by the settlement ruling on ${disputeName(state.settlement)}. Unfinished milestones were cancelled, and the escrow is paid out as ruled${
      date ? ` on ${date}` : state.payout ? " once the payout goes through" : ""
    }.`;
  }
  return null;
}

/** Short label for a contract the viewer can no longer dispute, or null when they can. */
export function contractDisputeBlockLabel(filing?: ContractDisputeFiling | null): string | null {
  if (!filing || filing.canFile) return null;
  if (filing.code === "DISPUTE_ALREADY_FILED") return "You already filed a dispute";
  if (filing.code === "DISPUTE_WINDOW_CLOSED") return "Dispute window closed";
  if (filing.code === "DISPUTE_PAYOUT_PENDING") return "Dispute payout pending";
  if (filing.code === "DISPUTE_DECISION_PENDING") return "Decide on the contract first";
  return "Can't be disputed";
}

/** The case behind a filing block, for its "View" button: the viewer's own, or the pending payout's. */
export function contractDisputeBlockingDispute(filing?: ContractDisputeFiling | null): ContractActiveDispute | null {
  if (!filing || filing.canFile) return null;
  if (filing.code === "DISPUTE_PAYOUT_PENDING") return filing.pendingPayout || null;
  // The decision lives on the contract page, not in a case.
  if (filing.code === "DISPUTE_DECISION_PENDING") return null;
  return filing.previousDispute || null;
}

/** "Scheduled to be paid on Dec 3, 2026." for a payout that is still due in the future. */
export function contractDisputePayoutText(filing?: ContractDisputeFiling | null): string | null {
  const payout = filing?.code === "DISPUTE_PAYOUT_PENDING" ? filing.pendingPayout : null;
  if (!payout || payout.payoutStatus !== "scheduled" || !payout.releaseAt) return null;
  const date = new Date(payout.releaseAt);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return null;
  return `Scheduled to be paid on ${date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}.`;
}

/** "You can file a dispute until Dec 17, 2026." for an ended contract still in its window. */
export function contractDisputeWindowText(filing?: ContractDisputeFiling | null): string | null {
  if (!filing?.canFile || !filing.windowEndsAt) return null;
  const date = new Date(filing.windowEndsAt);
  if (Number.isNaN(date.getTime())) return null;
  return `You can file a dispute until ${date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}.`;
}

/** Where "View dispute" should go, or null when this viewer cannot open the case yet. */
export function contractDisputePath(dispute?: ContractActiveDispute | null): string | null {
  if (!dispute) return null;
  if (dispute.visibility && dispute.id) return `/disputes/${dispute.id}`;
  // A private case is the filer's conversation with staff, in Cases.
  if (dispute.filedByViewer) return dispute.id ? casePath("dispute", dispute.id) : "/contracts/disputes";
  return null;
}

/** One-line status for contract cards. */
export function contractDisputeHeadline(dispute: ContractActiveDispute): string {
  if (dispute.visibility) {
    return dispute.number ? `Dispute ${dispute.number} is open` : "This dispute is open";
  }
  if (dispute.filedByViewer) return "You filed a dispute. Waiting for staff to open it.";
  return "The other party filed a dispute. Staff are reviewing it.";
}

/** Longer explanation for the contract page and the dispute form. */
export function contractDisputeDetail(dispute: ContractActiveDispute): string {
  if (dispute.visibility) {
    return dispute.number
      ? `Dispute ${dispute.number} is open to both parties. Share your side in that case.`
      : "This dispute is open to both parties. Share your side in that case.";
  }
  if (dispute.filedByViewer) {
    return "You filed this dispute. Add more information for staff until they open it to the other party.";
  }
  return "The other party already filed a dispute on this contract, so you can't open a second one. Staff will open the case to you, and you can share your side there.";
}
