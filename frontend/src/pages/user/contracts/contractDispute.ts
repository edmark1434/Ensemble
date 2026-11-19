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
  | "DISPUTE_PAYOUT_PENDING";

export const CONTRACT_DISPUTE_FILING_CODES: readonly ContractDisputeFilingCode[] = [
  "DISPUTE_ALREADY_FILED",
  "DISPUTE_WINDOW_CLOSED",
  "DISPUTE_PAYOUT_PENDING",
];

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

/** Short label for a contract the viewer can no longer dispute, or null when they can. */
export function contractDisputeBlockLabel(filing?: ContractDisputeFiling | null): string | null {
  if (!filing || filing.canFile) return null;
  if (filing.code === "DISPUTE_ALREADY_FILED") return "You already filed a dispute";
  if (filing.code === "DISPUTE_WINDOW_CLOSED") return "Dispute window closed";
  if (filing.code === "DISPUTE_PAYOUT_PENDING") return "Dispute payout pending";
  return "Can't be disputed";
}

/** The case behind a filing block, for its "View" button: the viewer's own, or the pending payout's. */
export function contractDisputeBlockingDispute(filing?: ContractDisputeFiling | null): ContractActiveDispute | null {
  if (!filing || filing.canFile) return null;
  if (filing.code === "DISPUTE_PAYOUT_PENDING") return filing.pendingPayout || null;
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
