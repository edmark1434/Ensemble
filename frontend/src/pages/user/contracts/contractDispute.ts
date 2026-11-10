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

/** Where "View dispute" should go, or null when this viewer cannot open the case yet. */
export function contractDisputePath(dispute?: ContractActiveDispute | null): string | null {
  if (!dispute) return null;
  if (dispute.visibility && dispute.id) return `/disputes/${dispute.id}`;
  if (dispute.filedByViewer) return "/contracts/disputes";
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
