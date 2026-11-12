/**
 * Detecting and parsing dispute rulings.
 *
 * Kept free of JSX and component imports so the logic can be exercised on its own:
 * `disputeUi.tsx` re-exports everything here.
 */

/** Rulings written before the Dispute Resolution author existed still read as decisions. */
const LEGACY_RULING_PATTERNS = [
  /^final decision\b/i,
  /^case reopened\b/i,
  /^this dispute (?:is resolved|has been reopened)\b/i,
  /^staff have closed this dispute\b/i,
  /has been permanently banned\./i,
];

/**
 * A ruling posted by the platform when a case is resolved, reopened or sanctioned.
 * New rulings carry the Dispute Resolution author; older rows are matched on their
 * wording so they render the same way instead of looking like an admin's chat line.
 */
export function isDisputeDecision(message?: {
  authorRole?: string | null;
  authorType?: string | null;
  body?: string | null;
}) {
  const role = String(message?.authorRole || "").toLowerCase();
  const type = String(message?.authorType || "").toLowerCase();
  if (role === "resolution" || type === "system") return true;
  // Only a staff-authored message can be a legacy ruling — a member cannot fake one.
  if (role !== "staff" && type !== "staff") return false;
  const body = String(message?.body || "").trim();
  if (!body) return false;
  const first = body.split("\n")[0].trim();
  return LEGACY_RULING_PATTERNS.some((pattern) => pattern.test(first) || pattern.test(body));
}

export type ParsedRuling = {
  kind: "decision" | "reopen" | "parties" | "payout";
  title: string;
  reference: string | null;
  outcomeLabel: string;
  outcome: string | null;
  paragraphs: string[];
  note: string | null;
  closing: string | null;
};

/**
 * Split a ruling into its parts so the card can show the outcome large and the
 * boilerplate small. Older free-text rulings fall back to a single paragraph.
 */
export function parseDisputeRuling(body?: string | null): ParsedRuling {
  const text = String(body || "").trim();
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const head = blocks[0] || "";
  const headMatch = head.match(
    /^(Final decision|Case reopened|Parties swapped|Payout released|Payout date changed|Payout delayed|Ruling withdrawn)(?:\s+[—-]\s+(.+))?$/i
  );
  const kind: ParsedRuling["kind"] = headMatch
    ? /parties swapped/i.test(headMatch[1])
      ? "parties"
      : /case reopened/i.test(headMatch[1])
        ? "reopen"
        : /payout|ruling withdrawn/i.test(headMatch[1])
          ? "payout"
          : "decision"
    : /reopen/i.test(text)
      ? "reopen"
      : "decision";

  const result: ParsedRuling = {
    kind,
    title:
      kind === "parties"
        ? "Parties swapped"
        : kind === "reopen"
          ? "Case reopened"
          : kind === "payout"
            ? headMatch?.[1] || "Payout update"
            : "Final decision",
    reference: headMatch?.[2]?.trim() || null,
    outcomeLabel:
      kind === "parties" ? "Change" : kind === "reopen" ? "Reason" : kind === "payout" ? "Status" : "Outcome",
    outcome: null,
    paragraphs: [],
    note: null,
    closing: null,
  };

  const rest = headMatch ? blocks.slice(1) : blocks;
  for (const block of rest) {
    const outcome = block.match(/^(Outcome|Reason|Change|Status):\s*(.+)$/i);
    if (outcome) {
      result.outcomeLabel = outcome[1];
      result.outcome = outcome[2].trim();
      continue;
    }
    const note = block.match(/^Reviewing staff noted:\s*([\s\S]+)$/i);
    if (note) {
      result.note = note[1].trim();
      continue;
    }
    if (/^(This case is now closed|The case is open again|The case stays open|The credits are in)/i.test(block)) {
      result.closing = result.closing ? `${result.closing}\n\n${block}` : block;
      continue;
    }
    result.paragraphs.push(block);
  }
  return result;
}
