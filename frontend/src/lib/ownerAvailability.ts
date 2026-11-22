/**
 * "Paused while restricted" copy for listings whose owner cannot answer right now
 * (backend `lib/OwnerAvailability.js`, `owner_unavailable_reason` / `sellerUnavailableReason` /
 * `creator_unavailable_reason`). The listing leaves browse and refuses new proposals, orders or
 * purchases; it comes back on its own when the standing ends.
 */

export type OwnerUnavailableReason = "deactivated" | "suspended" | "locked" | "banned" | "team_leader";

const ROLE_NOUN = { client: "This client", seller: "This seller", creator: "This creator" } as const;
const ACTION = {
  client: "taking proposals",
  seller: "taking orders",
  creator: "selling this asset",
} as const;

export function normalizeUnavailableReason(value: unknown): OwnerUnavailableReason | null {
  const reason = String(value || "").toLowerCase();
  return ["deactivated", "suspended", "locked", "banned", "team_leader"].includes(reason)
    ? (reason as OwnerUnavailableReason)
    : null;
}

/** What a visitor sees instead of the Apply / Order / Buy button. */
export function pausedListingText(reason: OwnerUnavailableReason | null, role: keyof typeof ROLE_NOUN): string | null {
  if (!reason) return null;
  const who = ROLE_NOUN[role];
  const doing = ACTION[role];
  switch (reason) {
    case "deactivated":
      return `${who} has deactivated their account, so they are not ${doing} right now.`;
    case "suspended":
      return `${who}'s account is suspended, so they are not ${doing} until the suspension ends.`;
    case "team_leader":
      return `This team's leader can't use Ensemble right now, so the team is not ${doing} for now.`;
    default:
      return `${who}'s account is restricted, so they are not ${doing}.`;
  }
}

/** What the owner sees on their own paused listing. */
export function ownPausedText(reason: OwnerUnavailableReason | null): string | null {
  if (!reason) return null;
  switch (reason) {
    case "suspended":
      return "Paused while your account is suspended. It is hidden from browse and takes no new proposals or orders; it comes back on its own when the suspension ends.";
    case "team_leader":
      return "Paused because your team's leader can't use Ensemble right now. It comes back when Support assigns a new owner or the restriction ends. You don't need to open a ticket.";
    case "deactivated":
      return "Hidden while your account is deactivated. It comes back when you reactivate.";
    default:
      return "Paused while your account is restricted. It is hidden from browse and comes back on its own when the restriction ends.";
  }
}
