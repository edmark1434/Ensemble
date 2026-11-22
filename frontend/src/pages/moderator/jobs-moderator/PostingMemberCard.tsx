import { useState } from "react";
import { Bell, Bookmark, Clock, Eye, EyeOff, Flag, Lock, Send, ShoppingCart, Users, Wrench } from "lucide-react";
import { CreditIcon } from "@/components/ui/credit-icon";
import { SubscriptionIcon } from "@/components/ui/SubscriptionIcon";
import { VerificationIcon } from "@/components/ui/VerificationIcon";
import { resolveAvatarPath } from "@/lib/accountAvatars";
import { getDefaultJobBannerForJob } from "@/lib/defaultJobBanners";
import { getImageUrl } from "@/lib/utils";
import type { JobsGigsPosting, PostingOwner } from "../shared/moderatorTypes";
import {
  formatCredits,
  formatDateTime,
  initials,
  memberViewFor,
  plainExcerpt,
  relativeTime,
  statusPill,
  typeBadge,
  type MemberView,
} from "./postingUi";

/** The card picture members see: the posting's cover, or the same default banner the board uses. */
export function postingThumbnail(posting: Pick<JobsGigsPosting, "id" | "thumbnailPath">) {
  return getImageUrl(posting.thumbnailPath) || getDefaultJobBannerForJob(String(posting.id));
}

export function OwnerAvatar({ owner, size = "sm" }: { owner: Pick<PostingOwner, "name" | "avatarPath">; size?: "sm" | "md" }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? undefined : resolveAvatarPath(owner.avatarPath);
  const cls = size === "md" ? "h-10 w-10 text-sm" : "h-6 w-6 text-[10px]";
  if (src) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className={`${cls} shrink-0 rounded-full border border-white/10 object-cover`}
      />
    );
  }
  return (
    <span
      className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-emerald-500/15 font-bold text-emerald-200 ring-1 ring-white/10`}
    >
      {initials(owner.name) || "?"}
    </span>
  );
}

function MemberStatusChip({ chip }: { chip: MemberView["chip"] }) {
  const tone =
    chip === "Open"
      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
      : chip === "Closed"
        ? "border-red-500/25 bg-red-500/10 text-red-300"
        : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400";
  return <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${tone}`}>{chip}</span>;
}

/**
 * A job or gig laid out like the member board card: cover, status chip, price, title,
 * description, skills and owner. The ribbon on the cover says when members cannot see it.
 */
export function PostingMemberPreview({ posting }: { posting: JobsGigsPosting }) {
  const view = memberViewFor(posting.status);
  const isJob = posting.type === "job";
  const skills = posting.tags || [];
  const excerpt = plainExcerpt(posting.description);
  const price = isJob
    ? formatCredits(posting.rateCreditsMin, posting.rateCreditsMax)
    : formatCredits(posting.rateCreditsMin, null);

  return (
    <div className="flex h-full flex-col">
      <div className="relative h-36 w-full shrink-0 overflow-hidden border-b border-white/5 bg-zinc-900">
        <img
          src={postingThumbnail(posting)}
          alt=""
          className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            view.onBoard ? "opacity-80" : "opacity-40 grayscale"
          }`}
        />
        <div className="absolute left-2 top-2 flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-[10px] font-semibold text-white">
            {isJob ? <Send className="h-3 w-3" /> : <ShoppingCart className="h-3 w-3" />}
            {posting.applicantCount} {isJob ? "Proposals" : "Orders"}
          </span>
        </div>
        <div className="absolute right-2 top-2">{typeBadge(posting.type)}</div>
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          {isJob && posting.experienceLevel && (
            <span className="rounded border border-white/15 bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold capitalize text-zinc-300">
              {posting.experienceLevel}
            </span>
          )}
          {typeof posting.slots === "number" && (
            <span className="flex items-center gap-1 rounded border border-white/15 bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-300">
              <Users className="h-2.5 w-2.5" />
              {posting.slots} {isJob ? (posting.slots === 1 ? "Position" : "Positions") : posting.slots === 1 ? "Slot" : "Slots"}
            </span>
          )}
        </div>
        {!view.onBoard && (
          <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
            <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/75 px-3 py-1 text-[11px] font-semibold text-white">
              <EyeOff className="h-3.5 w-3.5" />
              {posting.status === "archived" ? "Removed from Ensemble" : "Hidden from the board"}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <MemberStatusChip chip={view.chip} />
            <span className="rounded border border-white/10 bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
              {posting.category || "General"}
            </span>
          </div>
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-base font-black text-amber-400">
              <CreditIcon className="h-4 w-4 shrink-0 text-amber-400" />
              {price}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {isJob ? posting.paymentType || "Budget" : "Starting at"}
            </span>
          </div>
          <h3 className="mb-1 line-clamp-1 text-sm font-bold text-white group-hover:text-emerald-300" title={posting.title}>
            {posting.title || "Untitled posting"}
          </h3>
          <p className="mb-3 line-clamp-2 text-[12px] leading-relaxed text-zinc-400">
            {excerpt || <span className="italic text-zinc-600">No description.</span>}
          </p>
          {skills.length > 0 && (
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <Wrench className="mr-0.5 h-3 w-3 shrink-0 text-zinc-500" />
              {skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="rounded-md border border-white/10 bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300"
                >
                  {skill}
                </span>
              ))}
              {skills.length > 3 && (
                <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">
                  +{skills.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-3 text-[11px] text-zinc-400">
          <div className="flex min-w-0 items-center gap-1.5">
            <OwnerAvatar owner={posting.author} />
            <span className="truncate font-semibold text-zinc-300">{posting.author.name}</span>
            <VerificationIcon verified={posting.author.isVerified} />
            <SubscriptionIcon plan={posting.author.subscriptionPlan} />
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[10px] text-zinc-500" title={formatDateTime(posting.createdAt)}>
            <Clock className="h-3 w-3" />
            {relativeTime(posting.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

const ACTION_VERB: Record<string, string> = {
  active: "Reopened",
  paused: "Paused",
  closed: "Closed",
  archived: "Archived",
};

/** The last staff change and the notice it sent the owner. */
export function LastStaffActionNote({ posting }: { posting: JobsGigsPosting }) {
  const action = posting.lastStaffAction;
  if (!action?.status) return null;
  return (
    <p className="flex items-start gap-1.5 text-[11px] leading-snug text-zinc-400" title={formatDateTime(action.at)}>
      <Bell className="mt-0.5 h-3 w-3 shrink-0 text-sky-300" />
      <span className="line-clamp-2">
        <span className="font-medium text-zinc-200">{ACTION_VERB[action.status] || action.status}</span>
        {action.by ? (
          <>
            {" "}by <span className="font-medium text-zinc-200">{action.by.name}</span>
            {action.by.role ? <span className="text-zinc-500"> ({action.by.role})</span> : null}
          </>
        ) : null}{" "}
        {relativeTime(action.at)} · owner notified
        {action.reportNumber ? ` · ${action.reportNumber}` : ""}
        {action.reason ? <span className="text-zinc-500"> · “{action.reason}”</span> : null}
      </span>
    </p>
  );
}

/**
 * Jobs & Gigs Control card: the member view on top and what moderators need underneath
 * (post number, moderator status, staff hold, reports, visibility, last notice, pipeline, actions).
 */
export default function PostingMemberCard({
  posting,
  saving,
  onOpen,
  onOwner,
  actions,
}: {
  posting: JobsGigsPosting;
  saving?: boolean;
  onOpen: () => void;
  onOwner: () => void;
  actions: React.ReactNode;
}) {
  const reports = posting.openReportCount ?? 0;
  const view = memberViewFor(posting.status);
  const isJob = posting.type === "job";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-[#14151c] transition hover:border-white/20 focus:outline-none focus-visible:border-emerald-500/50 ${
        reports > 0 ? "border-red-500/30" : "border-white/[0.08]"
      } ${saving ? "opacity-60" : ""}`}
    >
      <div className="flex-1">
        <PostingMemberPreview posting={posting} />
      </div>

      <div className="space-y-2 border-t border-white/[0.06] bg-[#0f1016] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] text-zinc-500">{posting.postNumber}</span>
            {statusPill(posting.status)}
            {posting.staffHoldAt && posting.status !== "active" && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200"
                title={`Staff hold since ${formatDateTime(posting.staffHoldAt)}: the owner cannot reopen it`}
              >
                <Lock className="h-3 w-3" />
                Staff hold
              </span>
            )}
            {reports > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-300">
                <Flag className="h-3 w-3" />
                {reports} open
              </span>
            )}
          </div>
          <div
            className="shrink-0"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {actions}
          </div>
        </div>

        <p className={`flex items-center gap-1.5 text-[11px] ${view.onBoard ? "text-zinc-400" : "text-amber-200/90"}`}>
          {view.onBoard ? <Eye className="h-3 w-3 shrink-0" /> : <EyeOff className="h-3 w-3 shrink-0" />}
          <span className="truncate">Members: {view.summary}</span>
        </p>

        <LastStaffActionNote posting={posting} />

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
          <span className="tabular-nums">
            {posting.applicantCount} {isJob ? "proposals" : "requests"} · {posting.contractCount} contracts
            <span className="inline-flex items-center gap-0.5">
              {" · "}
              <Bookmark className="h-3 w-3" />
              {posting.savesCount ?? 0}
            </span>
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOwner();
            }}
            className="text-[11px] text-zinc-400 transition hover:text-emerald-300"
          >
            @{posting.author.handle} history
          </button>
        </div>
      </div>
    </article>
  );
}
