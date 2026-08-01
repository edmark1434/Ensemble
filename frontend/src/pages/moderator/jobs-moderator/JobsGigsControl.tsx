import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  Clock,
  Coins,
  Eye,
  FileSignature,
  FileText,
  Gem,
  History,
  Inbox,
  Layers,
  Loader2,
  Paperclip,
  Pause,
  Play,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast.ts";
import type { JobsGigsPosting, JobsGigsPostingDetail, UserJobsHistory } from "../shared/moderatorTypes";

const TYPE_TABS = ["all", "job", "gig"] as const;
const STATUS_TABS = ["all", "active", "paused", "closed", "archived"] as const;

function postingStatusClass(status: string) {
  switch (status) {
    case "active":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
    case "paused":
      return "border-amber-500/25 bg-amber-500/10 text-amber-300";
    case "closed":
      return "border-zinc-500/25 bg-zinc-500/10 text-zinc-300";
    case "archived":
      return "border-red-500/25 bg-red-500/10 text-red-300";
    default:
      return "border-zinc-500/25 bg-zinc-500/10 text-zinc-300";
  }
}

function statusDotClass(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-400";
    case "paused":
      return "bg-amber-400";
    case "closed":
      return "bg-zinc-400";
    case "archived":
      return "bg-red-400";
    default:
      return "bg-zinc-400";
  }
}

function formatCredits(min: number | null, max: number | null) {
  if (min === null && max === null) return "—";
  if (min !== null && max !== null && min !== max) return `${min.toLocaleString()}–${max.toLocaleString()}`;
  return (min ?? max ?? 0).toLocaleString();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeTime(value: string | null | undefined) {
  if (!value) return "—";
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function statusPill(status: string) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${postingStatusClass(status)}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(status)}`} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function typeBadge(type: "job" | "gig") {
  return type === "job" ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-300">
      <Briefcase className="h-3 w-3" /> Job
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
      <Gem className="h-3 w-3" /> Gig
    </span>
  );
}

function AuthorCell({ name, handle, onClick }: { name: string; handle: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title="View user history" className="group flex items-center gap-2.5 text-left">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/20 text-[11px] font-bold text-emerald-200 ring-1 ring-white/10">
        {initials(name) || "?"}
      </span>
      <span className="min-w-0">
        <span className="block max-w-[140px] truncate text-xs font-medium text-zinc-200 group-hover:text-emerald-300">{name}</span>
        <span className="block max-w-[140px] truncate text-[11px] text-zinc-500 underline-offset-2 group-hover:underline">@{handle}</span>
      </span>
    </button>
  );
}

function SummaryChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#14151c] px-4 py-3">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-lg font-bold leading-tight text-white">{value}</p>
        <p className="text-[11px] text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[0.04] py-1.5 last:border-0">
      <span className="shrink-0 text-xs text-zinc-500">{label}</span>
      <span className="text-right text-xs text-zinc-200">{value}</span>
    </div>
  );
}

function SectionHeading({ icon: Icon, children }: { icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-white">
      {Icon && <Icon className="h-4 w-4 text-emerald-400" />}
      {children}
    </p>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-center text-xs text-zinc-600">{children}</p>;
}

function SkeletonRows() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3">
          <div className="h-8 w-8 rounded-full bg-white/5" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-white/5" />
            <div className="h-2.5 w-1/5 rounded bg-white/5" />
          </div>
          <div className="h-5 w-16 rounded-full bg-white/5" />
          <div className="h-5 w-20 rounded-full bg-white/5" />
        </div>
      ))}
    </div>
  );
}

function PostingDetailModal({
  posting,
  onClose,
  onModerate,
  onViewHistory,
  saving,
}: {
  posting: JobsGigsPosting;
  onClose: () => void;
  onModerate: (posting: JobsGigsPosting, status: string) => Promise<void>;
  onViewHistory: (accountId: string) => void;
  saving: boolean;
}) {
  const [detail, setDetail] = useState<JobsGigsPostingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/moderator/jobs/postings/${posting.type}/${posting.id}`);
        if (active && res.data?.success) setDetail(res.data.data);
      } catch {
        if (active) showErrorToast("Failed to load posting detail");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [posting.type, posting.id, posting.status]);

  const isArchived = posting.status === "archived";
  const headerGradient =
    posting.type === "job"
      ? "from-sky-500/[0.12] via-transparent to-transparent"
      : "from-violet-500/[0.12] via-transparent to-transparent";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 border-b border-white/[0.06] bg-gradient-to-r ${headerGradient} bg-[#0f1016]/95 px-6 py-4 backdrop-blur`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {typeBadge(posting.type)}
                <span className="font-mono text-[11px] text-zinc-500">{posting.postNumber}</span>
                {statusPill(posting.status)}
              </div>
              <h2 className="mt-1.5 truncate pr-4 text-lg font-bold text-white">{posting.title}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            </div>
          ) : !detail ? (
            <p className="py-12 text-center text-sm text-zinc-500">Could not load this posting.</p>
          ) : (
            <div className="space-y-6">
              {/* Key stats */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <MiniStat
                  icon={Coins}
                  label="Rate (credits)"
                  value={
                    detail.type === "job"
                      ? `${detail.rateCreditsMin.toLocaleString()}–${detail.rateCreditsMax.toLocaleString()}`
                      : formatCredits(
                          detail.tiers.length ? Math.min(...detail.tiers.map((t) => t.rateCredits)) : null,
                          detail.tiers.length ? Math.max(...detail.tiers.map((t) => t.rateCredits)) : null
                        )
                  }
                />
                <MiniStat
                  icon={detail.type === "job" ? FileText : Inbox}
                  label={detail.type === "job" ? "Proposals" : "Requests"}
                  value={detail.type === "job" ? detail.proposals.length : detail.requests.length}
                />
                <MiniStat icon={FileSignature} label="Contracts" value={detail.contracts.length} />
                <MiniStat icon={CalendarDays} label="Created" value={formatDate(detail.createdAt)} />
              </div>

              {/* Author */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/20 text-sm font-bold text-emerald-200 ring-1 ring-white/10">
                    {initials(detail.author.name) || "?"}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {detail.author.name} <span className="font-normal text-zinc-500">@{detail.author.handle}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="capitalize">{detail.author.status}</span> account
                      {detail.author.meritScore !== null && (
                        <>
                          <span className="text-zinc-700">·</span> Merit score{" "}
                          <span className="font-medium text-zinc-300">{detail.author.meritScore}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onViewHistory(detail.author.accountId)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                >
                  <History className="h-3.5 w-3.5" />
                  Full history
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>

              {/* Description */}
              <div>
                <SectionHeading icon={FileText}>Description</SectionHeading>
                <p className="whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm leading-relaxed text-zinc-300">
                  {detail.description || "No description."}
                </p>
              </div>

              {/* Facts */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <SectionHeading icon={Layers}>Posting details</SectionHeading>
                  <DetailRow label="Payment type" value={<span className="capitalize">{detail.paymentType}</span>} />
                  {detail.type === "job" ? (
                    <>
                      <DetailRow label="Experience level" value={<span className="capitalize">{detail.experienceLevel}</span>} />
                      <DetailRow label="Hires needed" value={detail.noOfHires} />
                      <DetailRow label="Rough deadline" value={formatDate(detail.roughDeadline)} />
                      {detail.roughDurationHrs !== null && <DetailRow label="Est. duration" value={`${detail.roughDurationHrs} hrs`} />}
                      <DetailRow label="Revisions included" value={detail.roughNoOfRevisions} />
                      {detail.weeklyHrsMax !== null && <DetailRow label="Weekly hrs cap" value={`${detail.weeklyHrsMax} hrs`} />}
                    </>
                  ) : (
                    <>
                      <DetailRow label="Max concurrent orders" value={detail.noOfConcurrentMax} />
                      <DetailRow label="Pricing tiers" value={detail.tiers.length} />
                      <DetailRow label="Add-ons" value={detail.addons.length} />
                    </>
                  )}
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <SectionHeading icon={Clock}>Activity</SectionHeading>
                  <DetailRow label="Created" value={formatDateTime(detail.createdAt)} />
                  <DetailRow label="Last updated" value={relativeTime(detail.updatedAt)} />
                  <DetailRow label="Last viewed" value={relativeTime(detail.lastViewedAt)} />
                  {detail.archivedAt && <DetailRow label="Archived" value={formatDateTime(detail.archivedAt)} />}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-zinc-600" />
                    {detail.tags.length === 0 ? (
                      <span className="text-xs text-zinc-600">No tags</span>
                    ) : (
                      detail.tags.map((t) => (
                        <span key={t} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-300">
                          {t}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {detail.attachments.length > 0 && (
                <div>
                  <SectionHeading icon={Paperclip}>Attachments ({detail.attachments.length})</SectionHeading>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {detail.attachments.map((f) => (
                      <li key={f.fileId} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-zinc-300">
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                        <span className="truncate">{f.name}</span>
                        <span className="ml-auto shrink-0 text-zinc-600">{(f.sizeBytes / 1024).toFixed(1)} KB</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Gig tiers */}
              {detail.type === "gig" && (
                <div>
                  <SectionHeading icon={Layers}>Pricing tiers ({detail.tiers.length})</SectionHeading>
                  {detail.tiers.length === 0 ? (
                    <EmptyNote>No pricing tiers configured.</EmptyNote>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {detail.tiers.map((t) => (
                        <div key={t.id} className="rounded-xl border border-violet-500/15 bg-violet-500/[0.04] px-3.5 py-3">
                          <p className="text-sm font-semibold text-white">{t.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">{t.description}</p>
                          <p className="mt-2 flex items-center gap-1 text-sm font-bold text-violet-300">
                            <Coins className="h-3.5 w-3.5" />
                            {t.rateCredits.toLocaleString()}
                            <span className="text-[10px] font-normal text-zinc-500">credits</span>
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            {t.deliveryDays}-day delivery · {t.noOfRevisionsMax} revisions
                            {t.weeklyHrsMax !== null && ` · ${t.weeklyHrsMax} hrs/wk`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Gig addons */}
              {detail.type === "gig" && detail.addons.length > 0 && (
                <div>
                  <SectionHeading icon={PlusCircle}>Add-ons ({detail.addons.length})</SectionHeading>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {detail.addons.map((a) => (
                      <li key={a.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
                        <span className="text-zinc-200">{a.name}</span>
                        <span className="text-zinc-500">
                          +{a.priceCredits.toLocaleString()} cr · +{a.additionalDays}d
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Applicants */}
              <div>
                <SectionHeading icon={detail.type === "job" ? FileText : Inbox}>
                  {detail.type === "job" ? `Proposals (${detail.proposals.length})` : `Requests (${detail.requests.length})`}
                </SectionHeading>
                {detail.type === "job" ? (
                  detail.proposals.length === 0 ? (
                    <EmptyNote>No proposals submitted yet.</EmptyNote>
                  ) : (
                    <ul className="space-y-1.5">
                      {detail.proposals.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[10px] font-bold text-sky-300">
                              {initials(p.freelancer.name) || "?"}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-zinc-200">
                                {p.freelancer.name} <span className="text-zinc-500">@{p.freelancer.handle}</span>
                              </p>
                              <p className="text-[11px] text-zinc-500">
                                {p.rateCredits.toLocaleString()} credits · {p.milestoneCount} milestone(s) · {relativeTime(p.createdAt)}
                              </p>
                            </div>
                          </div>
                          {statusPill(p.status)}
                        </li>
                      ))}
                    </ul>
                  )
                ) : detail.requests.length === 0 ? (
                  <EmptyNote>No gig requests yet.</EmptyNote>
                ) : (
                  <ul className="space-y-1.5">
                    {detail.requests.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-300">
                            {initials(r.client.name) || "?"}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-zinc-200">
                              {r.client.name} <span className="text-zinc-500">@{r.client.handle}</span>
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {r.tierTitle} tier · {r.rateCredits.toLocaleString()} credits · {relativeTime(r.createdAt)}
                            </p>
                          </div>
                        </div>
                        {statusPill(r.status)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Contracts */}
              <div>
                <SectionHeading icon={FileSignature}>Contracts ({detail.contracts.length})</SectionHeading>
                {detail.contracts.length === 0 ? (
                  <EmptyNote>No contracts have been formed from this posting.</EmptyNote>
                ) : (
                  <ul className="space-y-1.5">
                    {detail.contracts.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-300">
                            {initials(c.counterparty.name) || "?"}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-zinc-200">
                              {c.counterparty.name} <span className="text-zinc-500">@{c.counterparty.handle}</span>
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {c.paymentType} · {c.rateCredits.toLocaleString()} credits · starts {formatDate(c.startsAt)}
                            </p>
                          </div>
                        </div>
                        {statusPill(c.status)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Moderation actions */}
        {!loading && detail && (
          <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-white/[0.06] bg-[#0f1016]/95 px-6 py-3.5 backdrop-blur">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Moderate</span>
            {isArchived ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void onModerate(posting, "active")}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" /> Restore posting
              </button>
            ) : (
              <>
                {posting.status !== "active" && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void onModerate(posting, "active")}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" /> Activate
                  </button>
                )}
                {posting.status !== "paused" && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void onModerate(posting, "paused")}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                  >
                    <Pause className="h-3.5 w-3.5" /> Pause
                  </button>
                )}
                {posting.status !== "closed" && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void onModerate(posting, "closed")}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-500/30 bg-zinc-500/10 px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-500/20 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Close
                  </button>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void onModerate(posting, "archived")}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  <Archive className="h-3.5 w-3.5" /> Archive
                </button>
              </>
            )}
            {saving && <Loader2 className="ml-1 h-4 w-4 animate-spin text-zinc-500" />}
          </div>
        )}
      </div>
    </div>
  );
}

function HistorySection({
  title,
  count,
  emptyText,
  children,
}: {
  title: string;
  count: number;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center justify-between text-sm font-semibold text-white">
        {title}
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400">{count}</span>
      </p>
      {count === 0 ? <EmptyNote>{emptyText}</EmptyNote> : children}
    </div>
  );
}

function UserHistoryModal({ accountId, onClose }: { accountId: string; onClose: () => void }) {
  const [history, setHistory] = useState<UserJobsHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get(`/api/moderator/jobs/users/${accountId}/history`);
        if (active && res.data?.success) setHistory(res.data.data);
      } catch {
        if (active) showErrorToast("Failed to load user history");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [accountId]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#0f1016]/95 px-6 py-4 backdrop-blur">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <User className="h-5 w-5 text-emerald-400" />
            User History
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            </div>
          ) : !history ? (
            <p className="py-12 text-center text-sm text-zinc-500">Could not load this user's history.</p>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/20 text-base font-bold text-emerald-200 ring-1 ring-white/10">
                  {initials(history.account.name) || "?"}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {history.account.name} <span className="font-normal text-zinc-500">@{history.account.handle}</span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    Account status: <span className="capitalize text-zinc-300">{history.account.status}</span>
                  </p>
                </div>
              </div>

              {/* Summary chips */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  { label: "Jobs", value: history.jobs.length },
                  { label: "Gigs", value: history.gigs.length },
                  { label: "Proposals", value: history.proposals.length },
                  { label: "Requests", value: history.gigRequests.length },
                  { label: "Contracts", value: history.contracts.length },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-center">
                    <p className="text-base font-bold text-white">{s.value}</p>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500">{s.label}</p>
                  </div>
                ))}
              </div>

              <HistorySection title="Jobs posted" count={history.jobs.length} emptyText="No jobs posted.">
                <ul className="space-y-1.5">
                  {history.jobs.map((j) => (
                    <li key={j.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate text-zinc-200">{j.title}</p>
                        <p className="text-[11px] text-zinc-500">
                          {j.paymentType} · {j.rateCreditsMin.toLocaleString()}–{j.rateCreditsMax.toLocaleString()} credits · {formatDate(j.createdAt)}
                        </p>
                      </div>
                      {statusPill(j.status)}
                    </li>
                  ))}
                </ul>
              </HistorySection>

              <HistorySection title="Gigs offered" count={history.gigs.length} emptyText="No gigs offered.">
                <ul className="space-y-1.5">
                  {history.gigs.map((g) => (
                    <li key={g.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate text-zinc-200">{g.title}</p>
                        <p className="text-[11px] text-zinc-500">
                          {g.paymentType} · {formatDate(g.createdAt)}
                        </p>
                      </div>
                      {statusPill(g.status)}
                    </li>
                  ))}
                </ul>
              </HistorySection>

              <HistorySection title="Proposals submitted" count={history.proposals.length} emptyText="No proposals submitted.">
                <ul className="space-y-1.5">
                  {history.proposals.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate text-zinc-200">{p.jobTitle || "Unknown job"}</p>
                        <p className="text-[11px] text-zinc-500">
                          {p.rateCredits.toLocaleString()} credits · {formatDate(p.createdAt)}
                        </p>
                      </div>
                      {statusPill(p.status)}
                    </li>
                  ))}
                </ul>
              </HistorySection>

              <HistorySection title="Gig requests made" count={history.gigRequests.length} emptyText="No gig requests made.">
                <ul className="space-y-1.5">
                  {history.gigRequests.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate text-zinc-200">{r.gigTitle}</p>
                        <p className="text-[11px] text-zinc-500">
                          {r.tierTitle} tier · {r.rateCredits.toLocaleString()} credits · {formatDate(r.createdAt)}
                        </p>
                      </div>
                      {statusPill(r.status)}
                    </li>
                  ))}
                </ul>
              </HistorySection>

              <HistorySection title="Contracts" count={history.contracts.length} emptyText="No contracts.">
                <ul className="space-y-1.5">
                  {history.contracts.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate text-zinc-200">{c.relatedTitle || `${c.type} contract`}</p>
                        <p className="text-[11px] text-zinc-500">
                          as {c.role} · {c.rateCredits.toLocaleString()} credits · {formatDate(c.createdAt)}
                        </p>
                      </div>
                      <span className="rounded-full border border-zinc-500/25 bg-zinc-500/10 px-2 py-0.5 text-[10px] font-medium capitalize text-zinc-300">
                        {c.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </HistorySection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JobsGigsControl() {
  const [postings, setPostings] = useState<JobsGigsPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_TABS)[number]>("all");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_TABS)[number]>("all");
  const [search, setSearch] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [historyAccountId, setHistoryAccountId] = useState<string | null>(null);
  const [selectedPosting, setSelectedPosting] = useState<JobsGigsPosting | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/moderator/jobs/postings", {
        params: {
          type: typeFilter === "all" ? undefined : typeFilter,
          status: statusFilter === "all" ? undefined : statusFilter,
          search: search.trim() || undefined,
        },
      });
      if (res.data?.success) setPostings(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => void load(), search ? 350 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter, search]);

  const summary = useMemo(
    () => ({
      total: postings.length,
      jobs: postings.filter((p) => p.type === "job").length,
      gigs: postings.filter((p) => p.type === "gig").length,
      applicants: postings.reduce((acc, p) => acc + p.applicantCount, 0),
      archived: postings.filter((p) => p.status === "archived").length,
    }),
    [postings]
  );

  const updatePosting = async (posting: JobsGigsPosting, status: string) => {
    const key = `${posting.type}-${posting.id}`;
    setSavingKey(key);
    try {
      const res = await api.patch(`/api/moderator/jobs/postings/${posting.type}/${posting.id}`, { status });
      showSuccessToast(`${posting.postNumber} marked ${status}`);
      if (res.data?.success && res.data.data && selectedPosting && String(selectedPosting.id) === String(posting.id)) {
        setSelectedPosting(res.data.data);
      }
      await load();
    } catch {
      showErrorToast("Failed to update posting");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:pl-[260px] md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400">Jobs &amp; Gigs Moderator</p>
          <h1 className="text-2xl font-bold text-white">Jobs &amp; Gigs Control</h1>
          <p className="mt-1 text-sm text-zinc-500">Review, audit and moderate every job and gig posting on the marketplace.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <SummaryChip icon={Layers} label="Postings in view" value={summary.total} tone="bg-emerald-500/15 text-emerald-300" />
        <SummaryChip icon={Briefcase} label="Jobs" value={summary.jobs} tone="bg-sky-500/15 text-sky-300" />
        <SummaryChip icon={Gem} label="Gigs" value={summary.gigs} tone="bg-violet-500/15 text-violet-300" />
        <SummaryChip icon={Users} label="Applicants" value={summary.applicants} tone="bg-teal-500/15 text-teal-300" />
        <SummaryChip icon={Archive} label="Archived" value={summary.archived} tone="bg-red-500/15 text-red-300" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#14151c] px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, author or post ID"
            className="w-64 rounded-lg border border-white/10 bg-[#0f1016] py-2 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-500/40"
          />
        </div>

        <div className="h-6 w-px bg-white/[0.06]" />

        <div className="flex gap-1.5">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTypeFilter(tab)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition ${
                typeFilter === tab
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tab === "all" ? "All types" : `${tab}s`}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-white/[0.06]" />

        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition ${
                statusFilter === tab
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        {loading ? (
          <SkeletonRows />
        ) : postings.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] text-zinc-600">
              <Inbox className="h-7 w-7" />
            </span>
            <div>
              <p className="text-sm font-medium text-zinc-400">No postings in this view</p>
              <p className="mt-0.5 text-xs text-zinc-600">Try clearing the search or switching type/status filters.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="pb-3 pl-2">Post ID</th>
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Author</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Rate (credits)</th>
                  <th className="pb-3 text-center">Applicants</th>
                  <th className="pb-3 text-center">Contracts</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3 pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {postings.map((p) => {
                  const key = `${p.type}-${p.id}`;
                  const saving = savingKey === key;
                  return (
                    <tr key={key} className="group transition hover:bg-white/[0.03]">
                      <td className="py-3 pl-2 font-mono text-[11px] text-zinc-400">{p.postNumber}</td>
                      <td className="max-w-[240px] py-3 pr-3">
                        <button
                          type="button"
                          onClick={() => setSelectedPosting(p)}
                          className="block max-w-full truncate text-left font-medium text-zinc-200 underline-offset-2 transition hover:text-emerald-300 hover:underline"
                          title={p.title}
                        >
                          {p.title}
                        </button>
                        {p.tags.length > 0 && (
                          <p className="mt-1 flex max-w-full flex-wrap gap-1">
                            {p.tags.slice(0, 3).map((t) => (
                              <span key={t} className="rounded-full border border-white/[0.06] bg-white/[0.03] px-1.5 py-px text-[9px] text-zinc-500">
                                {t}
                              </span>
                            ))}
                            {p.tags.length > 3 && <span className="text-[9px] text-zinc-600">+{p.tags.length - 3}</span>}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <AuthorCell name={p.author.name} handle={p.author.handle} onClick={() => setHistoryAccountId(p.author.accountId)} />
                      </td>
                      <td className="py-3 pr-3">
                        {typeBadge(p.type)}
                        {p.experienceLevel && <p className="mt-1 text-[10px] capitalize text-zinc-600">{p.experienceLevel}</p>}
                      </td>
                      <td className="py-3 pr-3">
                        <span className="flex items-center gap-1 text-zinc-300">
                          <Coins className="h-3.5 w-3.5 text-zinc-600" />
                          {formatCredits(p.rateCreditsMin, p.rateCreditsMax)}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`tabular-nums ${p.applicantCount > 0 ? "font-semibold text-zinc-200" : "text-zinc-600"}`}>
                          {p.applicantCount}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`tabular-nums ${p.contractCount > 0 ? "font-semibold text-zinc-200" : "text-zinc-600"}`}>
                          {p.contractCount}
                        </span>
                      </td>
                      <td className="py-3 pr-3">{statusPill(p.status)}</td>
                      <td className="py-3 pr-3">
                        <span className="text-xs text-zinc-500" title={formatDateTime(p.createdAt)}>
                          {relativeTime(p.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedPosting(p)}
                            title="View details"
                            className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setHistoryAccountId(p.author.accountId)}
                            title="User history"
                            className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-white"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                          {p.status === "archived" ? (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void updatePosting(p, "active")}
                              title="Restore posting"
                              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-1.5 text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                            >
                              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void updatePosting(p, "archived")}
                              title="Archive posting"
                              className="rounded-lg border border-red-500/30 bg-red-500/10 p-1.5 text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                            >
                              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedPosting && (
        <PostingDetailModal
          posting={selectedPosting}
          onClose={() => setSelectedPosting(null)}
          onModerate={updatePosting}
          onViewHistory={(accountId) => setHistoryAccountId(accountId)}
          saving={savingKey === `${selectedPosting.type}-${selectedPosting.id}`}
        />
      )}

      {historyAccountId !== null && (
        <UserHistoryModal accountId={historyAccountId} onClose={() => setHistoryAccountId(null)} />
      )}
    </main>
  );
}
