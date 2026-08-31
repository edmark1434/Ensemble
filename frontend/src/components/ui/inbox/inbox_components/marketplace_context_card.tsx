import { BriefcaseBusiness, ExternalLink, MessageSquareText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Inbox } from "../inbox_dataset";
import { CreditIcon } from "@/components/ui/credit-icon";

interface MarketplaceContextCardProps {
  conversation: Inbox;
  currentUserId: string;
  variant?: "banner" | "details";
}

export function MarketplaceContextCard({
  conversation,
  currentUserId,
  variant = "banner",
}: MarketplaceContextCardProps) {
  const navigate = useNavigate();
  const isRevision = conversation.conversation_type === "revision";
  const isJob =
    conversation.conversation_type === "marketplace_job" ||
    (isRevision && conversation.listing_type === "job");
  const isGig =
    conversation.conversation_type === "marketplace_gig" ||
    (isRevision && conversation.listing_type === "gig");
  if (!isJob && !isGig) return null;

  const isClient =
    String(conversation.client_account_id || "") === String(currentUserId);
  const contextPath = isClient
    ? conversation.client_context_path
    : conversation.freelancer_context_path;
  const contextLabel = isRevision ? "View task" : isJob ? "View proposal" : "View order";
  const listingLabel = isJob ? "View job" : "View gig";
  const typeLabel = isRevision
    ? `${isJob ? "Job" : "Gig"} revision discussion`
    : isJob
    ? "Job proposal discussion"
    : "Gig order discussion";
  const amount = Number(conversation.marketplace_amount_credits || 0);

  return (
    <section
      className={
        variant === "details"
          ? "mx-3 mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/[0.03]"
          : "border-b border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-dark-surface"
      }
      aria-label={typeLabel}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 rounded-lg border border-blue-500/20 bg-blue-500/10 p-2 text-blue-500 dark:text-blue-400">
          {isJob ? (
            <BriefcaseBusiness className="h-4 w-4" />
          ) : (
            <MessageSquareText className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              {typeLabel}
            </span>
            {conversation.marketplace_status && (
              <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:border-white/10 dark:text-zinc-400">
                {conversation.marketplace_status}
              </span>
            )}
          </div>

          <h3 className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
            {conversation.listing_title || conversation.conversation_name}
          </h3>

          {conversation.listing_preview && (
            <p
              className={
                variant === "details"
                  ? "mt-1 line-clamp-3 text-xs leading-5 text-gray-500 dark:text-zinc-400"
                  : "mt-1 line-clamp-1 text-xs text-gray-500 dark:text-zinc-400"
              }
            >
              {conversation.listing_preview}
            </p>
          )}

          {amount > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-yellow-600 dark:text-yellow-400">
              <CreditIcon className="h-3.5 w-3.5" />
              <span>{amount.toLocaleString()} credits</span>
            </div>
          )}

          {isRevision && Number(conversation.revision_price_credits || 0) > 0 && (
            <p className="mt-1 text-[11px] text-gray-500 dark:text-zinc-400">
              Revision rate: {Number(conversation.revision_price_credits).toLocaleString()} credits
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {contextPath && (
              <button
                type="button"
                onClick={() => navigate(contextPath)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
              >
                {contextLabel}
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
            {conversation.listing_path && (
              <button
                type="button"
                onClick={() => navigate(conversation.listing_path!)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/10"
              >
                {listingLabel}
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
