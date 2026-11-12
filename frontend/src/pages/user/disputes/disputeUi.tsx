import type { ReactNode } from "react";
import { Download, FileText, Gavel } from "lucide-react";
import { chatAttachmentUrl } from "@/components/ui/inbox/inbox_functions/inbox_upload_image";
import { isDisputeDecision, parseDisputeRuling } from "./disputeRuling";
export { isDisputeDecision, parseDisputeRuling } from "./disputeRuling";
export type { ParsedRuling } from "./disputeRuling";

export function titleCase(value?: string | null, fallback = "") {
  const text = String(value || fallback)
    .replace(/[_-]+/g, " ")
    .trim();
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatWhen(value?: string | null, withTime = true) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export function isClosedStatus(status?: string | null) {
  return String(status || "").toLowerCase() === "closed";
}

const ROLE_STYLES: Record<string, { label: string; className: string }> = {
  disputer: {
    label: "Disputer",
    className: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200",
  },
  disputee: {
    label: "Disputee",
    className: "border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-200",
  },
  staff: {
    label: "Staff",
    className: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  },
  community: {
    label: "Community",
    className: "border-gray-200 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300",
  },
};

export function roleKey(role?: string | null) {
  const value = String(role || "").toLowerCase();
  if (value === "public") return "community";
  return ROLE_STYLES[value] ? value : null;
}

export function RoleChip({ role }: { role?: string | null }) {
  const key = roleKey(role);
  if (!key) return null;
  const style = ROLE_STYLES[key];
  return (
    <span className={`rounded-full border px-2 py-px text-[10px] font-semibold uppercase tracking-wide ${style.className}`}>
      {style.label}
    </span>
  );
}

function statusClass(status?: string | null) {
  const value = String(status || "open").toLowerCase();
  if (value === "closed") {
    return "border-gray-200 bg-gray-100 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300";
  }
  if (value === "under review" || value === "under_review") {
    return "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200";
  }
  return "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200";
}

export function StatusPill({ status }: { status?: string | null }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusClass(status)}`}>
      {titleCase(status, "Open")}
    </span>
  );
}

export function VisibilityPill({ isPublic }: { isPublic: boolean }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        isPublic
          ? "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200"
          : "border-gray-200 bg-gray-100 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
      }`}
    >
      {isPublic ? "Public" : "Private"}
    </span>
  );
}

export type ViewerRole = "disputer" | "disputee" | "community" | null | undefined;

/**
 * Who can read a dispute message, written from the reader's own point of view.
 * `null` means the message carries no restriction worth announcing (it is public).
 */
export function audienceNotice(audience?: string | null, viewerRole?: ViewerRole) {
  const value = String(audience || "").toLowerCase();
  const otherParty = viewerRole === "disputee" ? "the disputer" : "the disputee";
  if (value === "public" || value === "") return null;
  if (value === "staff") {
    return { label: "Staff only", detail: "Only staff can see this message.", private: true };
  }
  if (value === "author_and_staff") {
    return {
      label: "Only you and staff",
      detail: `Only you and staff can see this. ${
        viewerRole === "community" ? "It stays hidden until staff publish it." : "The other party can’t read it."
      }`,
      private: true,
    };
  }
  if (value === "disputer" || value === "disputee") {
    const aimedAtViewer =
      (value === "disputer" && viewerRole === "disputer") ||
      (value === "disputee" && viewerRole === "disputee");
    if (aimedAtViewer) {
      return {
        label: "Only you and staff",
        detail: `Staff sent this to you alone. ${titleCase(otherParty)} can’t see it.`,
        private: true,
      };
    }
    return {
      label: value === "disputer" ? "Disputer and staff" : "Disputee and staff",
      detail: `Staff sent this to ${value === "disputer" ? "the disputer" : "the disputee"} only.`,
      private: true,
    };
  }
  if (value === "parties") {
    return {
      label: "Both parties and staff",
      detail: "The disputer, the disputee, and staff can see this. It is not on the public page.",
      private: true,
    };
  }
  return null;
}

/** Badge naming who can read a message. Renders nothing for public messages. */
export function AudiencePill({
  audience,
  viewerRole,
}: {
  audience?: string | null;
  viewerRole?: ViewerRole;
}) {
  const notice = audienceNotice(audience, viewerRole);
  if (!notice) return null;
  return (
    <span
      title={notice.detail}
      className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <LockIcon />
      {notice.label}
    </span>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function Avatar({ name, role }: { name?: string | null; role?: string | null }) {
  const key = roleKey(role);
  const initial = String(name || "?").trim().charAt(0).toUpperCase() || "?";
  const tone =
    key === "disputer"
      ? "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200"
      : key === "disputee"
        ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-200"
        : key === "staff"
          ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
          : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-zinc-200";
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tone}`}>
      {initial}
    </span>
  );
}

export type DisputeAttachment = {
  attachment_id?: string;
  attachment_type?: string;
  attachment_key?: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
};

function formatBytes(size?: number) {
  const bytes = Number(size || 0);
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Images, video and files posted with a dispute message. */
export function DisputeAttachments({
  attachments,
  onPreview,
}: {
  attachments?: DisputeAttachment[] | null;
  onPreview?: (url: string, type: string) => void;
}) {
  const files = (attachments || []).filter((file) => file?.attachment_key || file?.attachment_url);
  if (!files.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {files.map((file, index) => {
        const key = file.attachment_key || file.attachment_url || "";
        const url = chatAttachmentUrl(key);
        const type = String(file.attachment_type || "file").toLowerCase();
        const name = file.attachment_name || "Attachment";
        const id = file.attachment_id || `${key}-${index}`;

        if (type === "image" || type === "gif") {
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPreview?.(url, "image")}
              title={name}
              className="group relative h-24 w-24 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition hover:border-gray-400 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30"
            >
              <img src={url} alt={name} loading="lazy" className="h-full w-full object-cover" />
            </button>
          );
        }

        if (type === "video") {
          return (
            <video
              key={id}
              src={url}
              controls
              preload="metadata"
              className="h-32 max-w-full rounded-xl border border-gray-200 bg-black dark:border-white/10"
            />
          );
        }

        return (
          <a
            key={id}
            href={url}
            target="_blank"
            rel="noreferrer"
            download={name}
            className="flex max-w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs transition hover:border-gray-400 hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30 dark:hover:bg-white/10"
          >
            <FileText className="h-4 w-4 shrink-0 text-gray-400 dark:text-zinc-400" />
            <span className="min-w-0">
              <span className="block max-w-[14rem] truncate font-semibold text-gray-800 dark:text-zinc-200">
                {name}
              </span>
              {file.attachment_size ? (
                <span className="block text-[10px] text-gray-500 dark:text-zinc-500">
                  {formatBytes(file.attachment_size)}
                </span>
              ) : null}
            </span>
            <Download className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-zinc-500" />
          </a>
        );
      })}
    </div>
  );
}

const RULING_TONES = {
  decision: {
    shell: "border-indigo-300 bg-indigo-50/80 dark:border-indigo-400/40 dark:bg-indigo-500/[0.07]",
    shellDark: "border-indigo-400/40 bg-indigo-500/[0.07]",
    bar: "bg-indigo-100 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-100",
    barDark: "bg-indigo-500/20 text-indigo-100",
    icon: "text-indigo-500",
  },
  reopen: {
    shell: "border-sky-300 bg-sky-50/80 dark:border-sky-400/40 dark:bg-sky-500/[0.07]",
    shellDark: "border-sky-400/40 bg-sky-500/[0.07]",
    bar: "bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-100",
    barDark: "bg-sky-500/20 text-sky-100",
    icon: "text-sky-500",
  },
  parties: {
    shell: "border-amber-300 bg-amber-50/80 dark:border-amber-400/40 dark:bg-amber-500/[0.07]",
    shellDark: "border-amber-400/40 bg-amber-500/[0.07]",
    bar: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100",
    barDark: "bg-amber-500/20 text-amber-100",
    icon: "text-amber-500",
  },
  payout: {
    shell: "border-emerald-300 bg-emerald-50/80 dark:border-emerald-400/40 dark:bg-emerald-500/[0.07]",
    shellDark: "border-emerald-400/40 bg-emerald-500/[0.07]",
    bar: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100",
    barDark: "bg-emerald-500/20 text-emerald-100",
    icon: "text-emerald-500",
  },
} as const;

/**
 * A ruling, rendered as a verdict panel rather than a chat bubble: the outcome is the
 * headline, the author is the platform, and the boilerplate sits quietly at the foot.
 */
export function DisputeDecisionCard({
  body,
  when,
  dark = false,
  children,
}: {
  body?: string | null;
  when?: string | null;
  /** Force the dark palette for the staff console, which is dark regardless of theme. */
  dark?: boolean;
  children?: ReactNode;
}) {
  const ruling = parseDisputeRuling(body);
  const tone = RULING_TONES[ruling.kind];

  const shell = `border-2 ${dark ? tone.shellDark : tone.shell}`;
  const bar = dark ? tone.barDark : tone.bar;
  const strong = dark
    ? "text-white"
    : "text-gray-900 dark:text-white";
  const muted = dark ? "text-zinc-400" : "text-gray-500 dark:text-zinc-400";
  const bodyText = dark ? "text-zinc-200" : "text-gray-700 dark:text-zinc-200";
  const rule = dark ? "border-white/10" : "border-gray-200 dark:border-white/10";

  return (
    <article className={`overflow-hidden rounded-2xl shadow-sm ${shell}`}>
      <header className={`flex flex-wrap items-center gap-2 px-4 py-2.5 ${bar}`}>
        <Gavel className="h-4 w-4 shrink-0" />
        <span className="text-xs font-black uppercase tracking-[0.14em]">{ruling.title}</span>
        {ruling.reference ? (
          <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold tracking-wide dark:bg-white/10">
            {ruling.reference}
          </span>
        ) : null}
        {when ? <span className="ml-auto text-[11px] font-semibold opacity-80">{when}</span> : null}
      </header>

      <div className="space-y-3 px-5 py-4">
        {ruling.outcome ? (
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>
              {ruling.outcomeLabel}
            </p>
            <p className={`mt-0.5 text-lg font-extrabold leading-snug sm:text-xl ${strong}`}>
              {ruling.outcome}
            </p>
          </div>
        ) : null}

        {ruling.paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${bodyText}`}
          >
            {paragraph}
          </p>
        ))}

        {ruling.note ? (
          <div className={`rounded-xl border px-3 py-2 ${rule} ${dark ? "bg-white/[0.03]" : "bg-white/70 dark:bg-white/[0.03]"}`}>
            <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>
              Reviewing staff noted
            </p>
            <p className={`mt-0.5 whitespace-pre-wrap break-words text-sm ${bodyText}`}>{ruling.note}</p>
          </div>
        ) : null}

        {children}

        <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-2.5 ${rule}`}>
          <ShieldCheckIcon className={tone.icon} />
          <span className={`text-[11px] font-bold ${strong}`}>Dispute Resolution</span>
          <span className={`text-[11px] ${muted}`}>
            · {ruling.kind === "parties" || ruling.kind === "payout" ? "Ensemble platform notice" : "Ensemble platform decision"}
          </span>
        </div>

        {ruling.closing ? (
          <p className={`whitespace-pre-wrap text-[11px] leading-relaxed ${muted}`}>{ruling.closing}</p>
        ) : null}
      </div>
    </article>
  );
}

function ShieldCheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-3.5 w-3.5 shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/** The money side of a ruling as the two parties see it (`settlement` on dispute payloads). */
export type DisputeSettlement = {
  kind: "escrow_settle" | "transaction_reverse" | null;
  decidedAt: string | null;
  /** The case was reopened, so waiting payouts are on hold. */
  paused: boolean;
  payouts: {
    id: string;
    kind: "escrow_refund" | "escrow_release" | "reversal";
    amount: number;
    status: "scheduled" | "paid" | "failed" | "cancelled";
    releaseAt: string | null;
    paidAt: string | null;
    recipientRole: "client" | "freelancer" | null;
    recipientName: string;
    recipientHandle: string | null;
    isYou: boolean;
  }[];
};

function payoutLine(payout: DisputeSettlement["payouts"][number], paused: boolean) {
  if (payout.status === "paid") return { text: `Paid ${formatWhen(payout.paidAt)}`, tone: "paid" as const };
  if (payout.status === "failed") return { text: "Delayed — staff are completing it", tone: "warn" as const };
  if (paused) return { text: "On hold while the case is reviewed again", tone: "warn" as const };
  return { text: `Arrives ${formatWhen(payout.releaseAt)}`, tone: "waiting" as const };
}

const PAYOUT_TONES = {
  paid: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  waiting: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200",
  warn: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
};

/**
 * Who receives what from a dispute ruling, and when. Credits stay locked in escrow until the
 * payout date (7 days after the ruling by default), which leaves time to ask for an appeal.
 */
export function DisputeSettlementCard({ settlement }: { settlement?: DisputeSettlement | null }) {
  if (!settlement || !settlement.payouts?.length) return null;
  const waiting = settlement.payouts.some((p) => p.status === "scheduled" || p.status === "failed");
  const mine = settlement.payouts.filter((p) => p.isYou).reduce((sum, p) => sum + p.amount, 0);
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-gray-200 px-5 py-3 dark:border-white/10">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-zinc-400">
          {settlement.kind === "transaction_reverse" ? "Reversal" : "Settlement"}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
          {mine > 0
            ? `${mine.toLocaleString()} credits ${waiting ? "are coming" : "were paid"} to you`
            : "How the credits were split"}
        </p>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-white/5">
        {settlement.payouts.map((payout) => {
          const line = payoutLine(payout, settlement.paused);
          const who = payout.isYou
            ? "You"
            : payout.recipientHandle
              ? `@${payout.recipientHandle}`
              : payout.recipientName;
          return (
            <li key={payout.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {who}
                  {payout.recipientRole ? (
                    <span className="ml-1.5 text-xs font-normal text-gray-500 dark:text-zinc-400">
                      {payout.recipientRole === "client" ? "Client" : "Freelancer"}
                    </span>
                  ) : null}
                </p>
                <span
                  className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PAYOUT_TONES[line.tone]}`}
                >
                  {line.text}
                </span>
              </div>
              <p className="text-base font-extrabold tabular-nums text-gray-900 dark:text-white">
                {payout.amount.toLocaleString()}
                <span className="ml-1 text-xs font-medium text-gray-500 dark:text-zinc-400">credits</span>
              </p>
            </li>
          );
        })}
      </ul>
      {waiting ? (
        <p className="border-t border-gray-200 px-5 py-3 text-xs leading-relaxed text-gray-500 dark:border-white/10 dark:text-zinc-400">
          The credits stay locked in escrow until the payout date, then go to the Account Wallet. If you
          think the ruling is wrong, contact Support to appeal before then.
        </p>
      ) : null}
    </Card>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-dark-surface ${className}`}
    >
      {children}
    </div>
  );
}
