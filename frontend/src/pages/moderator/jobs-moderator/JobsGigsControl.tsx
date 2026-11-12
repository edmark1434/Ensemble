import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Briefcase,
  ChevronDown,
  Clock,
  Coins,
  Eye,
  Flag,
  Gem,
  History,
  Inbox,
  Layers,
  Pause,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import api from "@/lib/axios";
import { peekStaffGet, staffGet } from "@/lib/staffCache";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast.ts";
import RowActionsMenu, { type MenuItem } from "@/pages/admin/userTeam/components/RowActionsMenu";
import type { JobsGigsPosting, JobsOverview } from "../shared/moderatorTypes";
import PostingDetailModal, { UserHistoryModal } from "./PostingDetailModal";
import {
  DEFAULT_JOBS_API_BASE,
  POSTING_ACTIONS,
  PostingReasonDialog,
  actionsForPostingStatus,
  apiErrorMessage,
  formatCredits,
  formatDateTime,
  initials,
  relativeTime,
  statusPill,
  typeBadge,
  type PostingAction,
} from "./postingUi";

const TYPE_TABS = ["all", "job", "gig"] as const;
const STATUS_TABS = ["all", "active", "paused", "closed", "archived"] as const;
const PAGE_STEPS = [100, 250, 500];

const SORT_OPTIONS = [
  { value: "flagged", label: "Most reported first" },
  { value: "newest", label: "Newest posted" },
  { value: "oldest", label: "Oldest posted" },
  { value: "updated", label: "Recently updated" },
  { value: "applicants", label: "Most applicants" },
  { value: "contracts", label: "Most contracts" },
  { value: "rate_desc", label: "Highest rate" },
  { value: "rate_asc", label: "Lowest rate" },
  { value: "title", label: "Title A–Z" },
] as const;

type TypeTab = (typeof TYPE_TABS)[number];
type StatusTab = (typeof STATUS_TABS)[number];
type SortKey = (typeof SORT_OPTIONS)[number]["value"];

function postingParams(type: string, status: string, search: string, sort: string, limit: number) {
  return {
    type: type === "all" ? undefined : type,
    status: status === "all" ? undefined : status,
    search: search.trim() || undefined,
    sort,
    limit,
  };
}

/** Per-status counts for the segmented filter, taken from the overview for the chosen type. */
function statusCounts(summary: JobsOverview["summary"] | null, type: TypeTab) {
  if (!summary) return null;
  const jobs = {
    active: summary.activeJobs,
    paused: summary.pausedJobs ?? 0,
    closed: summary.closedJobs ?? 0,
    archived: summary.archivedJobs ?? 0,
  };
  const gigs = {
    active: summary.activeGigs,
    paused: summary.pausedGigs ?? 0,
    closed: summary.closedGigs ?? 0,
    archived: summary.archivedGigs ?? 0,
  };
  const pick = (key: keyof typeof jobs) =>
    type === "job" ? jobs[key] : type === "gig" ? gigs[key] : jobs[key] + gigs[key];
  const active = pick("active");
  const paused = pick("paused");
  const closed = pick("closed");
  const archived = pick("archived");
  return { all: active + paused + closed + archived, active, paused, closed, archived };
}

function SummaryChip({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  sub?: string;
  tone: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = `flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
    active ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/[0.08] bg-[#14151c] hover:border-white/15"
  }`;
  const body = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-tight tabular-nums text-white">{value}</p>
        <p className="truncate text-[11px] text-zinc-500">{label}</p>
        {sub && <p className="truncate text-[10px] text-zinc-600">{sub}</p>}
      </div>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}

function SkeletonRows() {
  return (
    <div className="space-y-2 p-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-4 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3"
        >
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

function menuItems(posting: JobsGigsPosting): MenuItem[] {
  return [
    { id: "view", label: "Review posting", icon: Eye },
    { id: "history", label: "Owner history", icon: History },
    ...actionsForPostingStatus(posting.status).map((action) => ({
      id: action,
      label: POSTING_ACTIONS[action].label,
      icon: POSTING_ACTIONS[action].icon,
      danger: POSTING_ACTIONS[action].danger,
      section: "manage",
    })),
  ];
}

/**
 * Jobs & Gigs Control: the moderation queue for every job and gig posting.
 *
 * Shared by the Jobs & Gigs moderator console and Admin → Moderation → Jobs & Gigs;
 * only `apiBase` differs, so both always moderate with the same rules.
 */
export default function JobsGigsControl({
  apiBase = DEFAULT_JOBS_API_BASE,
  embedded = false,
}: {
  apiBase?: string;
  embedded?: boolean;
} = {}) {
  const overviewUrl = `${apiBase}/overview`;
  const postingsUrl = `${apiBase}/postings`;
  const [typeFilter, setTypeFilter] = useState<TypeTab>("all");
  const [statusFilter, setStatusFilter] = useState<StatusTab>("all");
  const [sort, setSort] = useState<SortKey>("flagged");
  const [search, setSearch] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE_STEPS[0]);
  const params = postingParams(typeFilter, statusFilter, search, sort, limit);
  const [postings, setPostings] = useState<JobsGigsPosting[]>(() => {
    const cached = peekStaffGet(postingsUrl, params);
    return cached?.data?.success ? cached.data.data : [];
  });
  const [overviewSummary, setOverviewSummary] = useState<JobsOverview["summary"] | null>(() => {
    const cached = peekStaffGet(overviewUrl);
    return cached?.data?.success ? cached.data.data.summary : null;
  });
  const [loading, setLoading] = useState(() => !peekStaffGet(postingsUrl, params)?.data?.success);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [historyAccountId, setHistoryAccountId] = useState<string | null>(null);
  const [selected, setSelected] = useState<JobsGigsPosting | null>(null);
  const [prompt, setPrompt] = useState<{ posting: JobsGigsPosting; action: PostingAction } | null>(null);
  const shownKey = useRef(loading ? null : JSON.stringify(params));

  const loadOverview = async () => {
    try {
      const res = await staffGet(overviewUrl);
      if (res.data?.success) setOverviewSummary(res.data.data.summary);
    } catch {
      /* counts fall back to what is in view */
    }
  };

  const load = async () => {
    const next = postingParams(typeFilter, statusFilter, search, sort, limit);
    const key = JSON.stringify(next);
    const cached = peekStaffGet(postingsUrl, next);
    if (cached?.data?.success) {
      shownKey.current = key;
      setPostings(cached.data.data);
    }
    if (shownKey.current === key) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await staffGet(postingsUrl, next);
      if (res.data?.success) {
        shownKey.current = key;
        setPostings(res.data.data);
      }
    } catch {
      showErrorToast("Failed to load postings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([load(), loadOverview()]);
  };

  useEffect(() => {
    void loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overviewUrl]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), search ? 350 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter, search, sort, limit, postingsUrl]);

  // A new filter starts from the first page again.
  useEffect(() => {
    setLimit(PAGE_STEPS[0]);
  }, [typeFilter, statusFilter, search, sort]);

  const counts = useMemo(() => statusCounts(overviewSummary, typeFilter), [overviewSummary, typeFilter]);
  const visible = useMemo(
    () => (flaggedOnly ? postings.filter((p) => (p.openReportCount ?? 0) > 0) : postings),
    [postings, flaggedOnly]
  );
  const flaggedInView = postings.filter((p) => (p.openReportCount ?? 0) > 0).length;
  const openReportsInView = postings.reduce((acc, p) => acc + (p.openReportCount ?? 0), 0);
  const applicantsInView = postings.reduce((acc, p) => acc + p.applicantCount, 0);
  const filtersActive =
    typeFilter !== "all" || statusFilter !== "all" || sort !== "flagged" || Boolean(search) || flaggedOnly;

  const clearFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setSort("flagged");
    setSearch("");
    setFlaggedOnly(false);
  };

  const runAction = async (posting: JobsGigsPosting, action: PostingAction, reason: string) => {
    const meta = POSTING_ACTIONS[action];
    const key = `${posting.type}-${posting.id}`;
    setSavingKey(key);
    try {
      await api.patch(`${apiBase}/postings/${posting.type}/${posting.id}`, {
        status: meta.status,
        reason: reason || undefined,
      });
      showSuccessToast(`${posting.postNumber} · ${meta.successMessage.toLowerCase()}`);
      setPrompt(null);
      await refreshAll();
    } catch (err) {
      showErrorToast(apiErrorMessage(err, "Failed to update posting"));
    } finally {
      setSavingKey(null);
    }
  };

  const onMenuAction = (posting: JobsGigsPosting, id: string) => {
    if (id === "view") setSelected(posting);
    else if (id === "history") setHistoryAccountId(String(posting.author.accountId));
    else if (id in POSTING_ACTIONS) setPrompt({ posting, action: id as PostingAction });
  };

  const totalForView = counts ? counts[statusFilter] : null;
  const shellClass = embedded ? "relative z-10 space-y-5" : "relative z-10 min-h-screen px-6 py-8 md:pl-[260px] md:px-10";
  const Shell = embedded ? "div" : "main";

  const refreshButton = (
    <button
      type="button"
      onClick={() => void refreshAll()}
      disabled={loading || refreshing}
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading || refreshing ? "animate-spin" : ""}`} />
      Refresh
    </button>
  );

  return (
    <Shell className={shellClass} style={embedded ? undefined : { animation: "fadeIn 420ms ease" }}>
      {embedded ? (
        <div className="flex justify-end">{refreshButton}</div>
      ) : (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
              Jobs &amp; Gigs Moderator
            </p>
            <h1 className="text-2xl font-bold text-white">Jobs &amp; Gigs Control</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Review every job and gig on the board. Reported postings float to the top — pause while
              you investigate, close or archive when a violation is confirmed.
            </p>
          </div>
          {refreshButton}
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <SummaryChip
          icon={Layers}
          label="All postings"
          value={statusCounts(overviewSummary, "all")?.all ?? postings.length}
          sub={overviewSummary ? `${overviewSummary.jobsThisWeek + overviewSummary.gigsThisWeek} new this week` : undefined}
          tone="bg-emerald-500/15 text-emerald-300"
          active={typeFilter === "all" && statusFilter === "all" && !flaggedOnly}
          onClick={clearFilters}
        />
        <SummaryChip
          icon={Briefcase}
          label="Jobs"
          value={overviewSummary?.totalJobs ?? postings.filter((p) => p.type === "job").length}
          sub={overviewSummary ? `${overviewSummary.activeJobs} active` : undefined}
          tone="bg-sky-500/15 text-sky-300"
          active={typeFilter === "job"}
          onClick={() => setTypeFilter("job")}
        />
        <SummaryChip
          icon={Gem}
          label="Gigs"
          value={overviewSummary?.totalGigs ?? postings.filter((p) => p.type === "gig").length}
          sub={overviewSummary ? `${overviewSummary.activeGigs} active` : undefined}
          tone="bg-violet-500/15 text-violet-300"
          active={typeFilter === "gig"}
          onClick={() => setTypeFilter("gig")}
        />
        <SummaryChip
          icon={Flag}
          label="Reported in view"
          value={flaggedInView}
          sub={`${openReportsInView} open report${openReportsInView === 1 ? "" : "s"}`}
          tone="bg-red-500/15 text-red-300"
          active={flaggedOnly}
          onClick={() => setFlaggedOnly((v) => !v)}
        />
        <SummaryChip
          icon={Pause}
          label="Paused"
          value={counts?.paused ?? postings.filter((p) => p.status === "paused").length}
          sub="Hidden while under review"
          tone="bg-amber-500/15 text-amber-300"
          active={statusFilter === "paused"}
          onClick={() => setStatusFilter("paused")}
        />
        <SummaryChip
          icon={Archive}
          label="Archived"
          value={counts?.archived ?? postings.filter((p) => p.status === "archived").length}
          sub="Removed from the board"
          tone="bg-zinc-500/15 text-zinc-300"
          active={statusFilter === "archived"}
          onClick={() => setStatusFilter("archived")}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016]">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, owner, @handle or post ID…"
              className="w-full rounded-xl border border-white/[0.08] bg-[#14151c] py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-500/40"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-white/[0.08] bg-[#14151c] p-1">
              {TYPE_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTypeFilter(tab)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    typeFilter === tab ? "bg-emerald-500/15 text-emerald-200" : "text-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  {tab === "all" ? "All types" : tab === "job" ? "Jobs" : "Gigs"}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-lg border border-white/[0.08] bg-[#14151c] px-2.5 py-2 text-xs text-white outline-none focus:border-emerald-500/40"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setFlaggedOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                flaggedOnly
                  ? "border-red-500/40 bg-red-500/10 text-red-200"
                  : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              }`}
            >
              <Flag className="h-3.5 w-3.5" />
              Reported only
            </button>
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs text-zinc-500 transition hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] px-3 py-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                statusFilter === tab
                  ? "bg-emerald-500/15 text-emerald-100"
                  : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
              }`}
            >
              {tab === "all" ? "All statuses" : tab}
              {counts && <span className="ml-1.5 text-[10px] tabular-nums opacity-70">{counts[tab]}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonRows />
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] text-zinc-600">
              <Inbox className="h-7 w-7" />
            </span>
            <div>
              <p className="text-sm font-medium text-zinc-400">
                {flaggedOnly ? "No reported postings in this view" : "No postings in this view"}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600">Try clearing the search or switching filters.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wide text-zinc-500">
                    <th className="px-5 py-3 font-medium">Posting</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Rate (credits)</th>
                    <th className="px-4 py-3 font-medium">Pipeline</th>
                    <th className="px-4 py-3 font-medium">Reports</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Posted</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => {
                    const reports = p.openReportCount ?? 0;
                    return (
                      <tr
                        key={`${p.type}-${p.id}`}
                        tabIndex={0}
                        onClick={() => setSelected(p)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelected(p);
                          }
                        }}
                        className={`group cursor-pointer border-b border-white/[0.04] transition hover:bg-white/[0.03] focus:bg-white/[0.04] focus:outline-none ${
                          savingKey === `${p.type}-${p.id}` ? "opacity-60" : ""
                        }`}
                      >
                        <td className="max-w-[280px] px-5 py-3.5 align-top">
                          <p
                            className="truncate font-medium text-zinc-100 group-hover:text-emerald-300"
                            title={p.title}
                          >
                            {p.title}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-zinc-500">{p.postNumber}</p>
                          {p.tags.length > 0 && (
                            <p className="mt-1 flex flex-wrap gap-1">
                              {p.tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="rounded-full border border-white/[0.06] bg-white/[0.03] px-1.5 py-px text-[9px] text-zinc-500"
                                >
                                  {t}
                                </span>
                              ))}
                              {p.tags.length > 3 && (
                                <span className="text-[9px] text-zinc-600">+{p.tags.length - 3}</span>
                              )}
                            </p>
                          )}
                        </td>
                        <td
                          className="px-4 py-3.5 align-top"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => setHistoryAccountId(String(p.author.accountId))}
                            title="Owner history"
                            className="group/owner flex items-center gap-2.5 text-left"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-bold text-emerald-200 ring-1 ring-white/10">
                              {initials(p.author.name) || "?"}
                            </span>
                            <span className="min-w-0">
                              <span className="block max-w-[140px] truncate text-xs font-medium text-zinc-200 group-hover/owner:text-emerald-300">
                                {p.author.name}
                              </span>
                              <span className="block max-w-[140px] truncate text-[11px] text-zinc-500">
                                @{p.author.handle}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          {typeBadge(p.type)}
                          <p className="mt-1 max-w-[140px] truncate text-[11px] text-zinc-500">
                            {p.category || "Uncategorized"}
                            {p.experienceLevel ? ` · ${p.experienceLevel}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <span className="flex items-center gap-1 tabular-nums text-zinc-300">
                            <Coins className="h-3.5 w-3.5 text-zinc-600" />
                            {formatCredits(p.rateCreditsMin, p.rateCreditsMax)}
                          </span>
                          <p className="mt-1 text-[11px] capitalize text-zinc-600">{p.paymentType || "—"}</p>
                        </td>
                        <td className="px-4 py-3.5 align-top text-xs text-zinc-400">
                          <p>
                            <span className={`tabular-nums ${p.applicantCount > 0 ? "font-semibold text-zinc-200" : ""}`}>
                              {p.applicantCount}
                            </span>{" "}
                            {p.type === "job" ? "proposals" : "requests"}
                          </p>
                          <p className="mt-0.5">
                            <span className={`tabular-nums ${p.contractCount > 0 ? "font-semibold text-zinc-200" : ""}`}>
                              {p.contractCount}
                            </span>{" "}
                            contracts
                          </p>
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          {reports > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-300">
                              <Flag className="h-3 w-3" />
                              {reports} open
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-top">{statusPill(p.status)}</td>
                        <td className="px-4 py-3.5 align-top">
                          <span
                            className="inline-flex items-center gap-1 text-xs text-zinc-500"
                            title={formatDateTime(p.createdAt)}
                          >
                            <Clock className="h-3 w-3 text-zinc-600" />
                            {relativeTime(p.createdAt)}
                          </span>
                          {p.updatedAt && p.updatedAt !== p.createdAt && (
                            <p className="mt-0.5 text-[11px] text-zinc-600">updated {relativeTime(p.updatedAt)}</p>
                          )}
                        </td>
                        <td
                          className="px-5 py-3.5 text-right align-top"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <RowActionsMenu
                            items={menuItems(p)}
                            status={p.status}
                            statusLabel="Posting status"
                            sectionLabels={{ primary: "Posting", manage: "Moderate" }}
                            onAction={(id) => onMenuAction(p, id)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs text-zinc-500">
              <p>
                Showing <span className="tabular-nums text-zinc-300">{visible.length}</span> posting
                {visible.length === 1 ? "" : "s"}
                {totalForView !== null && !search ? ` of ${totalForView}` : ""}
                {` · ${applicantsInView} applicant${applicantsInView === 1 ? "" : "s"} in view`}
                {refreshing ? " · refreshing…" : ""}
              </p>
              {postings.length >= limit && limit < PAGE_STEPS[PAGE_STEPS.length - 1] && (
                <button
                  type="button"
                  onClick={() => setLimit((current) => PAGE_STEPS.find((step) => step > current) || current)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 transition hover:border-emerald-500/30 hover:text-emerald-200"
                >
                  <ChevronDown className="h-3 w-3" />
                  Load more
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {selected && (
        <PostingDetailModal
          type={selected.type}
          id={String(selected.id)}
          seedTitle={selected.title}
          apiBase={apiBase}
          onClose={() => setSelected(null)}
          onUpdated={() => void refreshAll()}
        />
      )}

      {historyAccountId !== null && (
        <UserHistoryModal
          accountId={historyAccountId}
          apiBase={apiBase}
          onClose={() => setHistoryAccountId(null)}
          onOpenPosting={(type, id) => {
            setHistoryAccountId(null);
            const existing = postings.find((p) => p.type === type && String(p.id) === String(id));
            setSelected(
              existing || {
                id,
                type,
                postNumber: "",
                title: "",
                description: null,
                status: "active",
                paymentType: "",
                experienceLevel: null,
                rateCreditsMin: null,
                rateCreditsMax: null,
                applicantCount: 0,
                contractCount: 0,
                tags: [],
                author: { accountId: "", name: "", handle: "" },
                createdAt: "",
                updatedAt: "",
                lastViewedAt: null,
                archivedAt: null,
              }
            );
          }}
        />
      )}

      {prompt && (
        <PostingReasonDialog
          action={prompt.action}
          postingTitle={`${prompt.posting.postNumber} · ${prompt.posting.title}`}
          saving={savingKey === `${prompt.posting.type}-${prompt.posting.id}`}
          onCancel={() => setPrompt(null)}
          onConfirm={(reason) => void runAction(prompt.posting, prompt.action, reason)}
        />
      )}
    </Shell>
  );
}

