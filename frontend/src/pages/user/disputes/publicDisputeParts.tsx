import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Check,
  CornerUpLeft,
  Eye,
  FileText,
  Gavel,
  Lock,
  MessagesSquare,
  Paperclip,
  Scale,
  Users,
} from "lucide-react";
import {
  AudiencePill,
  Avatar,
  Card,
  DisputeAttachments,
  DisputeSettlementCard,
  MentionText,
  RoleChip,
  audienceNotice,
  formatWhen,
  isDisputeDecision,
  parseDisputeRuling,
} from "./disputeUi";
import type { DisputeAttachment, DisputeSettlement, MentionMap, ViewerRole } from "./disputeUi";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type DiscussionMessage = {
  id: string;
  authorName?: string;
  authorRole?: string | null;
  body?: string;
  createdAt?: string | null;
  audience?: string;
  pendingReview?: boolean;
  replyToId?: string | null;
  authorType?: string | null;
  senderAccountId?: string | null;
  /** Stored profile picture path of the author; null for rulings and members without one. */
  authorAvatar?: string | null;
  attachments?: DisputeAttachment[];
};

export type DiscussionPerson = {
  accountId?: string | null;
  name?: string;
  handle?: string | null;
  avatar?: string | null;
};

/** The files the disputer attached when filing. Sent to the two parties only. */
export type FiledEvidence = {
  submittedAt?: string | null;
  authorAccountId?: string | null;
  attachments: DisputeAttachment[];
};

export type Discussion = {
  id: string;
  number?: string | null;
  title?: string;
  type?: string;
  status?: string;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  resolvedAt?: string | null;
  initiator?: DiscussionPerson;
  respondent?: DiscussionPerson;
  isParty?: boolean;
  viewerRole?: ViewerRole;
  canComment?: boolean;
  commentsNeedApproval?: boolean;
  /** Parties only: who receives what from the ruling, and when. */
  settlement?: DisputeSettlement | null;
  /** Parties only: the evidence filed with the complaint. */
  evidence?: FiledEvidence | null;
  /** Lower-cased handle → account id, for "@handle" profile links. */
  mentions?: MentionMap;
  chatId?: string | null;
  messages: DiscussionMessage[];
};

export type ThreadFilter = "all" | "rulings" | "parties" | "community";

export const THREAD_FILTERS: { key: ThreadFilter; label: string; empty: string }[] = [
  { key: "all", label: "All", empty: "No replies yet." },
  { key: "rulings", label: "Rulings", empty: "No rulings yet. Staff decisions appear here." },
  { key: "parties", label: "Parties & staff", empty: "The parties and staff haven’t posted yet." },
  { key: "community", label: "Community", empty: "No community replies are public yet." },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

export function messageCategory(message: DiscussionMessage): Exclude<ThreadFilter, "all"> {
  if (isDisputeDecision(message)) return "rulings";
  const role = String(message.authorRole || "").toLowerCase();
  if (role === "community" || role === "public") return "community";
  return "parties";
}

export function quoteSnippet(body?: string, limit = 160) {
  const text = String(body || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

/** "just now", "5m ago", "3h ago", "yesterday", then a plain date. */
export function relativeTime(value?: string | null) {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";
  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return formatWhen(value, false);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function dayKey(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return String(startOfDay(date));
}

export function dayLabel(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const diff = Math.round((startOfDay(today) - startOfDay(date)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}

function clockTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** A timestamp that reads relatively but shows the exact time on hover. */
export function When({ value, pending = false, className = "" }: { value?: string | null; pending?: boolean; className?: string }) {
  if (pending) return <span className={className}>Sending…</span>;
  if (!value) return null;
  return (
    <time dateTime={value} title={formatWhen(value)} className={className}>
      {relativeTime(value)}
    </time>
  );
}

const PANEL_TITLE = "text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-zinc-400";

export function Panel({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`p-4 ${className}`}>
      <p className={`mb-3 flex items-center gap-1.5 ${PANEL_TITLE}`}>
        {icon}
        {title}
      </p>
      {children}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Case header pieces                                                   */
/* ------------------------------------------------------------------ */

export function PartyTile({
  role,
  person,
  isYou,
  align = "left",
}: {
  role: "disputer" | "disputee";
  person?: DiscussionPerson;
  isYou?: boolean;
  align?: "left" | "right";
}) {
  const name = person?.name || "Unknown";
  const right = align === "right";
  const content = (
    <>
      <Avatar name={name} role={role} size="md" src={person?.avatar} />
      <span className={`min-w-0 ${right ? "sm:text-right" : ""}`}>
        <span className={`flex items-center gap-1.5 ${right ? "sm:justify-end" : ""}`}>
          <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">{name}</span>
          {isYou ? (
            <span className="shrink-0 rounded-full bg-gray-900 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white dark:bg-white dark:text-gray-900">
              You
            </span>
          ) : null}
        </span>
        <span className={`mt-0.5 flex min-w-0 items-center gap-1.5 ${right ? "sm:flex-row-reverse" : ""}`}>
          <RoleChip role={role} />
          {person?.handle ? (
            <span className="truncate text-xs text-gray-500 dark:text-zinc-400">@{person.handle}</span>
          ) : null}
        </span>
      </span>
    </>
  );
  const className = `flex min-w-0 items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.02] ${
    right ? "sm:flex-row-reverse" : ""
  }`;
  if (!person?.accountId) return <div className={className}>{content}</div>;
  return (
    <Link
      to={`/profile/${person.accountId}`}
      className={`${className} transition hover:border-gray-300 hover:bg-white dark:hover:border-white/20 dark:hover:bg-white/[0.05]`}
    >
      {content}
    </Link>
  );
}

/** Disputer on one side, disputee on the other. */
export function VersusParties({ discussion, className = "" }: { discussion: Discussion; className?: string }) {
  return (
    <div className={`grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] ${className}`}>
      <PartyTile role="disputer" person={discussion.initiator} isYou={discussion.viewerRole === "disputer"} />
      <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-[10px] font-black tracking-widest text-gray-400 dark:border-white/10 dark:bg-dark-surface dark:text-zinc-500">
        VS
      </span>
      <PartyTile
        role="disputee"
        person={discussion.respondent}
        isYou={discussion.viewerRole === "disputee"}
        align="right"
      />
    </div>
  );
}

export type StepState = "done" | "current" | "upcoming";

export function StepDot({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white dark:bg-emerald-500/90">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/40 motion-reduce:animate-none" />
        <span className="relative h-3 w-3 rounded-full border-2 border-amber-500 bg-amber-100 dark:bg-amber-500/30" />
      </span>
    );
  }
  return <span className="h-5 w-5 shrink-0 rounded-full border-2 border-gray-200 dark:border-white/15" />;
}

function caseSteps(discussion: Discussion, reopened: boolean) {
  const status = String(discussion.status || "open").toLowerCase();
  const closed = status === "closed";
  return [
    {
      label: "Filed",
      detail: formatWhen(discussion.createdAt, false) || "Received",
      state: "done" as StepState,
    },
    {
      label: reopened ? "Reopened" : status === "open" ? "Open for discussion" : "Under review",
      detail: closed ? "Review complete" : reopened ? "Being reviewed again" : "Staff are reviewing",
      state: (closed ? "done" : "current") as StepState,
    },
    {
      label: closed ? "Decided" : "Decision",
      detail: closed ? formatWhen(discussion.resolvedAt, false) || "Case closed" : "Pending",
      state: (closed ? "done" : "upcoming") as StepState,
    },
  ];
}

/** Filed → under review → decided, as a row (header) or a column (case panel). */
export function CaseProgress({
  discussion,
  reopened,
  layout = "row",
}: {
  discussion: Discussion;
  reopened: boolean;
  layout?: "row" | "column";
}) {
  const steps = caseSteps(discussion, reopened);
  if (layout === "column") {
    return (
      <ol className="space-y-0">
        {steps.map((step, index) => (
          <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
            {index < steps.length - 1 ? (
              <span
                className={`absolute left-[9px] top-6 h-[calc(100%-1.25rem)] w-0.5 rounded ${
                  step.state === "done" ? "bg-emerald-400/70" : "bg-gray-200 dark:bg-white/10"
                }`}
              />
            ) : null}
            <StepDot state={step.state} />
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${step.state === "upcoming" ? "text-gray-400 dark:text-zinc-500" : "text-gray-900 dark:text-white"}`}>
                {step.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol className="flex items-center gap-2">
      {steps.map((step, index) => (
        <li key={step.label} className={`flex min-w-0 items-center gap-2 ${index < steps.length - 1 ? "flex-1" : ""}`}>
          <StepDot state={step.state} />
          <span className="min-w-0">
            <span className={`block truncate text-xs font-semibold ${step.state === "upcoming" ? "text-gray-400 dark:text-zinc-500" : "text-gray-900 dark:text-white"}`}>
              {step.label}
            </span>
            <span className="block truncate text-[11px] text-gray-500 dark:text-zinc-400">{step.detail}</span>
          </span>
          {index < steps.length - 1 ? (
            <span
              className={`mx-1 h-0.5 min-w-6 flex-1 rounded ${
                step.state === "done" ? "bg-emerald-400/70" : "bg-gray-200 dark:bg-white/10"
              }`}
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Case panel (sidebar on desktop, drawer on phones)                    */
/* ------------------------------------------------------------------ */

function viewerPart(discussion: Discussion, signedIn: boolean) {
  const role = discussion.viewerRole;
  if (role === "disputer") {
    return {
      title: "You filed this dispute",
      detail:
        "Your replies go to staff first. Staff decide whether the other party or the public can read them.",
    };
  }
  if (role === "disputee") {
    return {
      title: "You’re named in this dispute",
      detail:
        "Tell your side here. Your replies go to staff first, and staff decide who else can read them.",
    };
  }
  if (signedIn) {
    return {
      title: "You’re following as a community member",
      detail:
        "You can add context. Staff review community replies before they appear for everyone else.",
    };
  }
  return {
    title: "You’re viewing as a guest",
    detail: "Sign in to take part. Replies from members outside the case are reviewed by staff first.",
  };
}

export function ComplaintText({ text, mentions }: { text: string; mentions?: MentionMap }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 320;
  return (
    <div>
      <p
        className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700 dark:text-zinc-300 ${
          long && !open ? "line-clamp-6" : ""
        }`}
      >
        <MentionText text={text} mentions={mentions} />
      </p>
      {long ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="mt-2 text-xs font-semibold text-gray-500 transition hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
        >
          {open ? "Show less" : "Read the full complaint"}
        </button>
      ) : null}
    </div>
  );
}

/**
 * The files filed with the complaint. The disputer sees what they sent; the disputee sees what
 * they are answering. Reaches the two parties only, never the community.
 */
export function FiledEvidencePanel({
  evidence,
  viewerRole,
  isPublic,
  onPreview,
}: {
  evidence?: FiledEvidence | null;
  viewerRole?: ViewerRole | "requester" | "participant" | null;
  /** Staff made the case public, so the disputee can see these files too. */
  isPublic: boolean;
  onPreview?: (url: string) => void;
}) {
  const files = evidence?.attachments || [];
  if (!files.length) return null;
  const count = `${files.length} file${files.length === 1 ? "" : "s"}`;
  const lead =
    viewerRole === "disputee"
      ? `The disputer filed ${count} with this complaint. You can answer them in your reply.`
      : viewerRole === "disputer"
        ? isPublic
          ? `You filed ${count} with this complaint. The other party can see them; the public cannot.`
          : `You filed ${count} with this complaint. If staff make the case public, the other party will see them too.`
        : `${count} filed with this complaint.`;
  return (
    <Panel title="Evidence filed" icon={<Paperclip className="h-3 w-3" />}>
      <p className="text-xs leading-relaxed text-gray-500 dark:text-zinc-400">{lead}</p>
      <DisputeAttachments attachments={files} onPreview={onPreview ? (url) => onPreview(url) : undefined} />
      {evidence?.submittedAt ? (
        <p className="mt-2 text-[11px] text-gray-400 dark:text-zinc-500">Filed {formatWhen(evidence.submittedAt)}</p>
      ) : null}
    </Panel>
  );
}

export function CasePanel({
  discussion,
  signedIn,
  reopened,
  latestRuling,
  stats,
  onOpenRuling,
  onPreview,
  showProgress = false,
  showParties = false,
}: {
  discussion: Discussion;
  signedIn: boolean;
  reopened: boolean;
  latestRuling?: DiscussionMessage;
  stats: { replies: number; rulings: number; participants: number };
  onOpenRuling: (messageId: string) => void;
  /** Opens an image from the filed evidence. */
  onPreview?: (url: string) => void;
  /** Desktop column and phone drawer: the header only shows progress on tablets. */
  showProgress?: boolean;
  /** Phone drawer: the header shows the parties on larger screens. */
  showParties?: boolean;
}) {
  const part = viewerPart(discussion, signedIn);
  const ruling = latestRuling ? parseDisputeRuling(latestRuling.body) : null;

  return (
    <div className="space-y-3">
      {showProgress ? (
        <Panel title="Case progress" icon={<Scale className="h-3 w-3" />}>
          <CaseProgress discussion={discussion} reopened={reopened} layout="column" />
        </Panel>
      ) : null}
      {showParties ? (
        <Panel title="Parties" icon={<Users className="h-3 w-3" />}>
          <div className="space-y-2">
            <PartyTile role="disputer" person={discussion.initiator} isYou={discussion.viewerRole === "disputer"} />
            <PartyTile role="disputee" person={discussion.respondent} isYou={discussion.viewerRole === "disputee"} />
          </div>
        </Panel>
      ) : null}

      <Panel title="Your part" icon={<Eye className="h-3 w-3" />}>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{part.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-zinc-400">{part.detail}</p>
      </Panel>

      {/* Only the two parties receive this; the community never sees the split. */}
      <DisputeSettlementCard settlement={discussion.settlement} />

      {ruling && latestRuling ? (
        <Panel title="Latest ruling" icon={<Gavel className="h-3 w-3" />}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
            {ruling.title}
          </p>
          <p className="mt-0.5 text-base font-bold leading-snug text-gray-900 dark:text-white">
            {ruling.outcome || "Decision posted"}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{formatWhen(latestRuling.createdAt)}</p>
          <button
            type="button"
            onClick={() => onOpenRuling(String(latestRuling.id))}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
          >
            Read the ruling
          </button>
        </Panel>
      ) : null}

      {discussion.description ? (
        <Panel title="Original complaint" icon={<FileText className="h-3 w-3" />}>
          <ComplaintText text={discussion.description} mentions={discussion.mentions} />
        </Panel>
      ) : null}

      <FiledEvidencePanel
        evidence={discussion.evidence}
        viewerRole={discussion.viewerRole}
        isPublic
        onPreview={onPreview}
      />

      <Panel title="Activity" icon={<MessagesSquare className="h-3 w-3" />}>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Replies", value: stats.replies },
            { label: "Rulings", value: stats.rulings },
            { label: "People", value: stats.participants },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-gray-50 px-2 py-2.5 dark:bg-white/[0.03]">
              <p className="text-lg font-extrabold tabular-nums text-gray-900 dark:text-white">{item.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">
                {item.label}
              </p>
            </div>
          ))}
        </div>
        <dl className="mt-3 space-y-1.5 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500 dark:text-zinc-500">Filed</dt>
            <dd className="text-right font-medium text-gray-800 dark:text-zinc-200">{formatWhen(discussion.createdAt) || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500 dark:text-zinc-500">Last activity</dt>
            <dd className="text-right font-medium text-gray-800 dark:text-zinc-200">
              {relativeTime(discussion.updatedAt) || "—"}
            </dd>
          </div>
        </dl>
      </Panel>

      <Panel title="Discussion guidelines" icon={<BookOpen className="h-3 w-3" />}>
        <ul className="space-y-2 text-xs leading-relaxed text-gray-600 dark:text-zinc-400">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-400 dark:bg-zinc-500" />
            Stick to facts about this case. Staff decide it on evidence, not on votes.
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-400 dark:bg-zinc-500" />
            Be respectful. Harassment of either party breaks the platform rules.
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-400 dark:bg-zinc-500" />
            Never post personal details, payment info or private files.
          </li>
        </ul>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Thread pieces                                                        */
/* ------------------------------------------------------------------ */

export function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3" role="separator">
      <span className="h-px flex-1 bg-gray-200 dark:bg-white/[0.07]" />
      <span className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:border-white/10 dark:bg-dark-surface dark:text-zinc-400">
        {label}
      </span>
      <span className="h-px flex-1 bg-gray-200 dark:bg-white/[0.07]" />
    </div>
  );
}

/** The quoted message shown above a reply. Explains itself when the viewer can't see the parent. */
export function QuotedMessage({ parent, onJump }: { parent?: DiscussionMessage; onJump?: () => void }) {
  if (!parent) {
    return (
      <p className="mb-2 flex items-center gap-1.5 rounded-lg border-l-2 border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[11px] italic text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-500">
        <CornerUpLeft className="h-3 w-3 shrink-0" />
        Replying to a message you can’t see
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={onJump}
      className="mb-2 block w-full max-w-xl rounded-lg border-l-2 border-gray-300 bg-gray-50 px-2.5 py-1.5 text-left transition hover:bg-gray-100 dark:border-white/20 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
    >
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 dark:text-zinc-300">
        <CornerUpLeft className="h-3 w-3 shrink-0" />
        {parent.authorName || "Member"}
      </span>
      <span className="mt-0.5 block truncate text-[11px] text-gray-500 dark:text-zinc-400">
        {quoteSnippet(parent.body)}
      </span>
    </button>
  );
}

/** One reply in the thread. `continued` folds the header into the previous reply by the same author. */
export function ThreadMessage({
  message,
  parent,
  continued,
  mine,
  pending,
  viewerRole,
  mentions,
  canReply,
  animate,
  onReply,
  onJumpToParent,
  onPreview,
}: {
  message: DiscussionMessage;
  parent?: DiscussionMessage;
  continued: boolean;
  mine: boolean;
  pending: boolean;
  viewerRole: ViewerRole;
  mentions?: MentionMap;
  canReply: boolean;
  animate: boolean;
  onReply: () => void;
  onJumpToParent?: () => void;
  onPreview: (url: string) => void;
}) {
  const held = Boolean(message.pendingReview);
  const notice = held ? null : audienceNotice(message.audience, viewerRole);
  const flagged = held || Boolean(notice);

  return (
    <div
      id={`dispute-message-${message.id}`}
      className={`group relative flex scroll-mt-4 gap-3 px-3 transition-colors sm:px-4 ${
        continued ? "py-0.5" : "mt-1 pb-1 pt-3"
      } ${
        flagged
          ? "border-l-2 border-amber-400/70 bg-amber-50/70 hover:bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/[0.05] dark:hover:bg-amber-500/[0.08]"
          : "rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.025]"
      } ${pending ? "opacity-60" : ""} ${
        animate ? "animate-[console-rise_0.35s_ease-out_backwards] motion-reduce:animate-none" : ""
      }`}
    >
      <div className="w-8 shrink-0">
        {continued ? (
          <span className="block pt-1 text-right text-[10px] tabular-nums text-gray-400 opacity-0 transition group-hover:opacity-100 dark:text-zinc-500">
            {pending ? "" : clockTime(message.createdAt)}
          </span>
        ) : (
          <Avatar name={message.authorName} role={message.authorRole} src={message.authorAvatar} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!continued ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {mine ? "You" : message.authorName || "Member"}
            </span>
            <RoleChip role={message.authorRole} />
            {held ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <Lock className="h-2.5 w-2.5" />
                Awaiting staff review
              </span>
            ) : null}
            {notice ? <AudiencePill audience={message.audience} viewerRole={viewerRole} /> : null}
            <When
              value={message.createdAt}
              pending={pending}
              className="text-[11px] text-gray-400 dark:text-zinc-500"
            />
          </div>
        ) : null}

        {continued ? null : held ? (
          <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300/80">
            Only you and staff can see this reply until a staff member or admin makes it public.
          </p>
        ) : notice ? (
          <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300/80">{notice.detail}</p>
        ) : null}

        <div className={continued ? "" : "mt-1"}>
          {message.replyToId ? <QuotedMessage parent={parent} onJump={onJumpToParent} /> : null}
          {message.body ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
              <MentionText text={message.body} mentions={mentions} />
            </p>
          ) : null}
          <DisputeAttachments attachments={message.attachments} onPreview={(url) => onPreview(url)} />
        </div>

        {canReply && !pending ? (
          <button
            type="button"
            onClick={onReply}
            className="mt-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] font-semibold text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:opacity-100 sm:absolute sm:right-2 sm:top-1 sm:mt-0 sm:border sm:border-gray-200 sm:bg-white sm:px-1.5 sm:opacity-0 sm:shadow-sm sm:group-hover:opacity-100 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-white sm:dark:border-white/10 sm:dark:bg-zinc-900"
          >
            <CornerUpLeft className="h-3 w-3" />
            Reply
          </button>
        ) : null}
      </div>
    </div>
  );
}
