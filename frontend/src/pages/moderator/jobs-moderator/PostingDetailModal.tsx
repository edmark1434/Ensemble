import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Coins,
  ExternalLink,
  FileSignature,
  FileText,
  Flag,
  History,
  Inbox,
  Layers,
  Loader2,
  Paperclip,
  PlusCircle,
  ShieldCheck,
  Tag,
  User,
  X,
} from "lucide-react";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast.ts";
import type { JobsGigsPostingDetail, UserJobsHistory } from "../shared/moderatorTypes";
import {
  DEFAULT_JOBS_API_BASE,
  POSTING_ACTIONS,
  PostingReasonDialog,
  actionsForPostingStatus,
  apiErrorMessage,
  formatCredits,
  formatDate,
  formatDateTime,
  initials,
  relativeTime,
  statusPill,
  typeBadge,
  type PostingAction,
} from "./postingUi";

const CLOSED_REPORT = new Set(["resolved", "closed", "dismissed", "denied", "archived", "sanctioned"]);

function publicPostingPath(type: "job" | "gig", id: string) {
  return type === "job" ? `/jobs/${id}/page` : `/gigs/services/${id}/page`;
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone = "text-white",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className={`mt-1 text-sm font-semibold tabular-nums ${tone}`}>{value}</p>
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

function SectionHeading({
  icon: Icon,
  children,
  count,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-white">
      {Icon && <Icon className="h-4 w-4 text-emerald-400" />}
      {children}
      {typeof count === "number" && (
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400">{count}</span>
      )}
    </p>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-center text-xs text-zinc-600">
      {children}
    </p>
  );
}

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const cls =
    size === "lg" ? "h-12 w-12 text-base" : size === "md" ? "h-10 w-10 text-sm" : "h-7 w-7 text-[10px]";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-emerald-500/15 font-bold text-emerald-200 ring-1 ring-white/10 ${cls}`}
    >
      {initials(name) || "?"}
    </span>
  );
}

function PersonRow({
  name,
  handle,
  meta,
  right,
}: {
  name: string;
  handle: string;
  meta: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm">
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar name={name} />
        <div className="min-w-0">
          <p className="truncate text-zinc-200">
            {name} <span className="text-zinc-500">@{handle}</span>
          </p>
          <p className="text-[11px] text-zinc-500">{meta}</p>
        </div>
      </div>
      {right}
    </li>
  );
}

/**
 * Full review of one job or gig posting, with its moderation actions.
 *
 * Loads its own data and performs its own PATCH, so the Control desk and the
 * dashboard open the same review without duplicating the action flow.
 */
export default function PostingDetailModal({
  type: initialType,
  id: initialId,
  seedTitle,
  apiBase = DEFAULT_JOBS_API_BASE,
  onClose,
  onUpdated,
}: {
  type: "job" | "gig";
  id: string;
  seedTitle?: string;
  apiBase?: string;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [target, setTarget] = useState({ type: initialType, id: initialId });
  const [detail, setDetail] = useState<JobsGigsPostingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<PostingAction | null>(null);
  const [historyAccountId, setHistoryAccountId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`${apiBase}/postings/${target.type}/${target.id}`);
      if (res.data?.success) setDetail(res.data.data);
      else setDetail(null);
    } catch {
      setDetail(null);
      showErrorToast("Failed to load posting detail");
    } finally {
      setLoading(false);
    }
  }, [apiBase, target.type, target.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pendingAction && !historyAccountId) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pendingAction, historyAccountId]);

  const runAction = async (action: PostingAction, reason: string) => {
    const meta = POSTING_ACTIONS[action];
    setSaving(true);
    try {
      const res = await api.patch(`${apiBase}/postings/${target.type}/${target.id}`, {
        status: meta.status,
        reason: reason || undefined,
      });
      if (res.data?.success && res.data.data) setDetail(res.data.data);
      showSuccessToast(meta.successMessage);
      setPendingAction(null);
      onUpdated?.();
    } catch (err) {
      showErrorToast(apiErrorMessage(err, "Failed to update posting"));
    } finally {
      setSaving(false);
    }
  };

  const reports = detail?.reports || [];
  const openReports = reports.filter((r) => !CLOSED_REPORT.has(String(r.status).toLowerCase()));
  const history = detail?.moderationHistory || [];
  const title = detail?.title || seedTitle || "Posting";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {typeBadge(target.type)}
                {detail && <span className="font-mono text-[11px] text-zinc-500">{detail.postNumber}</span>}
                {detail && statusPill(detail.status)}
                {openReports.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-300">
                    <Flag className="h-3 w-3" />
                    {openReports.length} open report{openReports.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <h2 className="mt-1.5 truncate pr-4 text-lg font-bold text-white">{title}</h2>
              {detail && (
                <p className="mt-0.5 text-xs text-zinc-500">
                  {detail.category || "Uncategorized"} · posted {formatDate(detail.createdAt)} · updated{" "}
                  {relativeTime(detail.updatedAt)}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {detail && detail.status !== "archived" && (
                <a
                  href={publicPostingPath(target.type, String(detail.id))}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-white/20 hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View on platform
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && !detail ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            </div>
          ) : !detail ? (
            <p className="py-12 text-center text-sm text-zinc-500">Could not load this posting.</p>
          ) : (
            <div className="space-y-6">
              {openReports.length > 0 && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-xs text-red-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                  <p>
                    This posting has {openReports.length} unresolved report
                    {openReports.length === 1 ? "" : "s"}. Review them below — pause it while you
                    investigate, or archive it if a policy violation is confirmed. Enforcement on the
                    owner&apos;s account is taken from the report case itself.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <MiniStat
                  icon={Coins}
                  label="Rate (credits)"
                  value={
                    detail.type === "job"
                      ? formatCredits(detail.rateCreditsMin, detail.rateCreditsMax)
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
                <MiniStat
                  icon={Flag}
                  label="Open reports"
                  value={openReports.length}
                  tone={openReports.length > 0 ? "text-red-300" : "text-white"}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={detail.author.name} size="md" />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {detail.author.name}{" "}
                      <span className="font-normal text-zinc-500">@{detail.author.handle}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      {detail.type === "job" ? "Client" : "Freelancer"} ·{" "}
                      <span className="capitalize">{detail.author.status || "unknown"}</span> account
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryAccountId(String(detail.author.accountId))}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                >
                  <History className="h-3.5 w-3.5" />
                  Owner history
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>

              <div>
                <SectionHeading icon={Flag} count={reports.length}>
                  Reports on this posting
                </SectionHeading>
                {reports.length === 0 ? (
                  <EmptyNote>No reports have been filed against this posting.</EmptyNote>
                ) : (
                  <ul className="space-y-1.5">
                    {reports.map((r) => (
                      <li key={r.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm text-zinc-200">
                            <span className="font-mono text-[11px] text-zinc-500">{r.number}</span>{" "}
                            · {r.type}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] capitalize text-zinc-400">
                              {r.priority || "medium"}
                            </span>
                            {statusPill(r.status)}
                          </div>
                        </div>
                        {r.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{r.description}</p>
                        )}
                        <p className="mt-1 text-[11px] text-zinc-600">
                          Filed by @{r.reporter.handle} · {relativeTime(r.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <SectionHeading icon={FileText}>Description</SectionHeading>
                <p className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm leading-relaxed text-zinc-300">
                  {detail.description || "No description."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <SectionHeading icon={Layers}>Posting details</SectionHeading>
                  <DetailRow label="Category" value={detail.category || "Uncategorized"} />
                  <DetailRow label="Payment type" value={<span className="capitalize">{detail.paymentType}</span>} />
                  {detail.type === "job" ? (
                    <>
                      <DetailRow
                        label="Experience level"
                        value={<span className="capitalize">{detail.experienceLevel || "—"}</span>}
                      />
                      <DetailRow label="Hires needed" value={detail.noOfHires} />
                      <DetailRow label="Rough deadline" value={formatDate(detail.roughDeadline)} />
                      {detail.roughDurationHrs !== null && (
                        <DetailRow label="Est. duration" value={`${detail.roughDurationHrs} hrs`} />
                      )}
                      <DetailRow label="Revisions included" value={detail.roughNoOfRevisions} />
                      {detail.weeklyHrsMax !== null && (
                        <DetailRow label="Weekly hrs cap" value={`${detail.weeklyHrsMax} hrs`} />
                      )}
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
                        <span
                          key={t}
                          className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-300"
                        >
                          {t}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {detail.attachments.length > 0 && (
                <div>
                  <SectionHeading icon={Paperclip} count={detail.attachments.length}>
                    Attachments
                  </SectionHeading>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {detail.attachments.map((f) => (
                      <li
                        key={f.fileId}
                        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-zinc-300"
                      >
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                        <span className="truncate">{f.name}</span>
                        <span className="ml-auto shrink-0 text-zinc-600">{(f.sizeBytes / 1024).toFixed(1)} KB</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.type === "gig" && (
                <div>
                  <SectionHeading icon={Layers} count={detail.tiers.length}>
                    Pricing tiers
                  </SectionHeading>
                  {detail.tiers.length === 0 ? (
                    <EmptyNote>No pricing tiers configured.</EmptyNote>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {detail.tiers.map((t) => (
                        <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3">
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

              {detail.type === "gig" && detail.addons.length > 0 && (
                <div>
                  <SectionHeading icon={PlusCircle} count={detail.addons.length}>
                    Add-ons
                  </SectionHeading>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {detail.addons.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs"
                      >
                        <span className="text-zinc-200">{a.name}</span>
                        <span className="text-zinc-500">
                          +{a.priceCredits.toLocaleString()} cr · +{a.additionalDays}d
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <SectionHeading
                  icon={detail.type === "job" ? FileText : Inbox}
                  count={detail.type === "job" ? detail.proposals.length : detail.requests.length}
                >
                  {detail.type === "job" ? "Proposals" : "Order requests"}
                </SectionHeading>
                {detail.type === "job" ? (
                  detail.proposals.length === 0 ? (
                    <EmptyNote>No proposals submitted yet.</EmptyNote>
                  ) : (
                    <ul className="space-y-1.5">
                      {detail.proposals.map((p) => (
                        <PersonRow
                          key={p.id}
                          name={p.freelancer.name}
                          handle={p.freelancer.handle}
                          meta={`${p.rateCredits.toLocaleString()} credits · ${p.milestoneCount} milestone(s) · ${relativeTime(p.createdAt)}`}
                          right={statusPill(p.status)}
                        />
                      ))}
                    </ul>
                  )
                ) : detail.requests.length === 0 ? (
                  <EmptyNote>No gig requests yet.</EmptyNote>
                ) : (
                  <ul className="space-y-1.5">
                    {detail.requests.map((r) => (
                      <PersonRow
                        key={r.id}
                        name={r.client.name}
                        handle={r.client.handle}
                        meta={`${r.tierTitle} tier · ${r.rateCredits.toLocaleString()} credits · ${relativeTime(r.createdAt)}`}
                        right={statusPill(r.status)}
                      />
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <SectionHeading icon={FileSignature} count={detail.contracts.length}>
                  Contracts
                </SectionHeading>
                {detail.contracts.length === 0 ? (
                  <EmptyNote>No contracts have been formed from this posting.</EmptyNote>
                ) : (
                  <ul className="space-y-1.5">
                    {detail.contracts.map((c) => (
                      <PersonRow
                        key={c.id}
                        name={c.counterparty.name}
                        handle={c.counterparty.handle}
                        meta={`${c.paymentType} · ${c.rateCredits.toLocaleString()} credits · starts ${formatDate(c.startsAt)}`}
                        right={statusPill(c.status)}
                      />
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <SectionHeading icon={History} count={history.length}>
                  Moderation history
                </SectionHeading>
                {history.length === 0 ? (
                  <EmptyNote>No staff action has been taken on this posting yet.</EmptyNote>
                ) : (
                  <ol className="space-y-1.5">
                    {history.map((h) => (
                      <li key={h.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="flex items-center gap-1.5 text-xs text-zinc-300">
                            {h.previousStatus && statusPill(h.previousStatus)}
                            {h.previousStatus && <span className="text-zinc-600">→</span>}
                            {h.status && statusPill(h.status)}
                          </p>
                          <span className="text-[11px] text-zinc-500" title={formatDateTime(h.createdAt)}>
                            {relativeTime(h.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">
                          {h.reason ? h.reason : <span className="italic text-zinc-600">No reason recorded</span>}
                        </p>
                        <p className="mt-0.5 text-[11px] text-zinc-600">
                          {h.actor ? `${h.actor.name} · ${h.actor.role}` : "Staff"}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}
        </div>

        {detail && (
          <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] bg-[#0f1016] px-6 py-3.5">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Moderate</span>
            {actionsForPostingStatus(detail.status).map((action) => {
              const meta = POSTING_ACTIONS[action];
              const Icon = meta.icon;
              return (
                <button
                  key={action}
                  type="button"
                  disabled={saving}
                  onClick={() => setPendingAction(action)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition disabled:opacity-50 ${meta.wideTone}`}
                >
                  <Icon className="h-3.5 w-3.5" /> {meta.label}
                </button>
              );
            })}
            {(saving || loading) && <Loader2 className="ml-1 h-4 w-4 animate-spin text-zinc-500" />}
            <span className="ml-auto text-[11px] text-zinc-600">Every action is logged with its reason.</span>
          </div>
        )}
      </div>

      {pendingAction && detail && (
        <PostingReasonDialog
          action={pendingAction}
          postingTitle={detail.title}
          saving={saving}
          onCancel={() => setPendingAction(null)}
          onConfirm={(reason) => void runAction(pendingAction, reason)}
        />
      )}

      {historyAccountId && (
        <UserHistoryModal
          accountId={historyAccountId}
          apiBase={apiBase}
          onClose={() => setHistoryAccountId(null)}
          onOpenPosting={(type, id) => {
            setHistoryAccountId(null);
            setDetail(null);
            setTarget({ type, id });
          }}
        />
      )}
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

function HistoryRow({
  title,
  meta,
  status,
  onOpen,
}: {
  title: string;
  meta: string;
  status: string;
  onOpen?: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
      <div className="min-w-0">
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="block max-w-full truncate text-left font-medium text-zinc-200 hover:text-emerald-300 hover:underline"
          >
            {title}
          </button>
        ) : (
          <p className="truncate text-zinc-200">{title}</p>
        )}
        <p className="text-[11px] text-zinc-500">{meta}</p>
      </div>
      {statusPill(status)}
    </li>
  );
}

/** Everything one account has done on Jobs & Gigs, from either side of a contract. */
export function UserHistoryModal({
  accountId,
  onClose,
  onOpenPosting,
  apiBase = DEFAULT_JOBS_API_BASE,
}: {
  accountId: string;
  onClose: () => void;
  onOpenPosting?: (type: "job" | "gig", id: string) => void;
  apiBase?: string;
}) {
  const [history, setHistory] = useState<UserJobsHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get(`${apiBase}/users/${accountId}/history`);
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
  }, [accountId, apiBase]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const merit = history?.account.merit ?? 100;
  const meritTone = merit >= 80 ? "text-emerald-300" : merit >= 50 ? "text-amber-300" : "text-red-300";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#0f1016] px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <User className="h-5 w-5 text-emerald-400" />
            Jobs &amp; Gigs history
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            </div>
          ) : !history ? (
            <p className="py-12 text-center text-sm text-zinc-500">Could not load this user&apos;s history.</p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={history.account.name} size="lg" />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {history.account.name}{" "}
                      <span className="font-normal text-zinc-500">@{history.account.handle}</span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      Account status: <span className="capitalize text-zinc-300">{history.account.status}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold tabular-nums ${meritTone}`}>{merit}</p>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">Platform merit</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  { label: "Jobs", value: history.jobs.length },
                  { label: "Gigs", value: history.gigs.length },
                  { label: "Proposals", value: history.proposals.length },
                  { label: "Requests", value: history.gigRequests.length },
                  { label: "Contracts", value: history.contracts.length },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-center">
                    <p className="text-base font-bold tabular-nums text-white">{s.value}</p>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500">{s.label}</p>
                  </div>
                ))}
              </div>

              <HistorySection title="Jobs posted" count={history.jobs.length} emptyText="No jobs posted.">
                <ul className="space-y-1.5">
                  {history.jobs.map((j) => (
                    <HistoryRow
                      key={j.id}
                      title={j.title}
                      meta={`${j.paymentType} · ${formatCredits(j.rateCreditsMin, j.rateCreditsMax)} credits · ${formatDate(j.createdAt)}`}
                      status={j.status}
                      onOpen={onOpenPosting ? () => onOpenPosting("job", String(j.id)) : undefined}
                    />
                  ))}
                </ul>
              </HistorySection>

              <HistorySection title="Gigs offered" count={history.gigs.length} emptyText="No gigs offered.">
                <ul className="space-y-1.5">
                  {history.gigs.map((g) => (
                    <HistoryRow
                      key={g.id}
                      title={g.title}
                      meta={`${g.paymentType} · ${formatDate(g.createdAt)}`}
                      status={g.status}
                      onOpen={onOpenPosting ? () => onOpenPosting("gig", String(g.id)) : undefined}
                    />
                  ))}
                </ul>
              </HistorySection>

              <HistorySection
                title="Proposals submitted"
                count={history.proposals.length}
                emptyText="No proposals submitted."
              >
                <ul className="space-y-1.5">
                  {history.proposals.map((p) => (
                    <HistoryRow
                      key={p.id}
                      title={p.jobTitle || "Unknown job"}
                      meta={`${p.rateCredits.toLocaleString()} credits · ${formatDate(p.createdAt)}`}
                      status={p.status}
                    />
                  ))}
                </ul>
              </HistorySection>

              <HistorySection
                title="Gig requests made"
                count={history.gigRequests.length}
                emptyText="No gig requests made."
              >
                <ul className="space-y-1.5">
                  {history.gigRequests.map((r) => (
                    <HistoryRow
                      key={r.id}
                      title={r.gigTitle}
                      meta={`${r.tierTitle} tier · ${r.rateCredits.toLocaleString()} credits · ${formatDate(r.createdAt)}`}
                      status={r.status}
                    />
                  ))}
                </ul>
              </HistorySection>

              <HistorySection title="Contracts" count={history.contracts.length} emptyText="No contracts.">
                <ul className="space-y-1.5">
                  {history.contracts.map((c) => (
                    <HistoryRow
                      key={c.id}
                      title={c.relatedTitle || `${c.type} contract`}
                      meta={`as ${c.role} · ${c.rateCredits.toLocaleString()} credits · ${formatDate(c.createdAt)}`}
                      status={c.status}
                    />
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

