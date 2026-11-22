import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  ExternalLink,
  FileWarning,
  History,
  Info,
  Loader2,
  RotateCw,
  ShieldAlert,
  Undo2,
  X,
} from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import { useStaffLive } from "@/lib/staffLive";
import { StaffStandingSummary, StatusPill, caseWhen } from "@/pages/moderator/shared/StaffStandingSummary";
import {
  ACCOUNT_ACTION_LABELS,
  consoleLinks,
  fetchModerationContext,
  type AccountActionId,
  type ContentActionId,
  type ModerationAccount,
  type ModerationActionResult,
  type ModerationContext,
} from "./platformModerationApi";
import { PlatformModerationActionDialog, type ActionDialogStart } from "./PlatformModerationActionDialog";

const ACCOUNT_ACTION_ORDER: AccountActionId[] = ["warn", "timeout", "suspend", "lock", "ban"];
const DESK_LABELS: Record<string, string> = {
  forum: "Forum",
  marketplace: "Marketplace",
  jobs: "Jobs & Gigs",
  support: "Support",
};

/** Wait this long after the frame settles on a page before asking the server about it. */
const CONTEXT_DEBOUNCE_MS = 250;

function Section({ title, icon, count, children }: { title: string; icon?: ReactNode; count?: number; children: ReactNode }) {
  return (
    <section className="border-b border-white/[0.06] px-4 py-3 last:border-b-0">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        {icon}
        {title}
        {count != null ? <span className="font-normal text-zinc-600">· {count}</span> : null}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Note({ tone = "info", children }: { tone?: "info" | "warn"; children: ReactNode }) {
  return (
    <p
      className={`flex items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] ${
        tone === "warn" ? "border-amber-500/25 bg-amber-500/[0.06] text-amber-100" : "border-white/[0.06] bg-white/[0.02] text-zinc-400"
      }`}
    >
      {tone === "warn" ? <AlertTriangle className="mt-px h-3 w-3 shrink-0" /> : <Info className="mt-px h-3 w-3 shrink-0" />}
      <span className="min-w-0">{children}</span>
    </p>
  );
}

function AccountCard({
  account,
  userTeamHref,
  onAction,
}: {
  account: ModerationAccount;
  userTeamHref: string | null;
  onAction: (accountId: string, action: AccountActionId) => void;
}) {
  const blocked = ACCOUNT_ACTION_ORDER.map((id) => account.actions[id]).filter((rule) => !rule.allowed);
  const allBlocked = blocked.length === ACCOUNT_ACTION_ORDER.length;
  const sharedReason = allBlocked && new Set(blocked.map((rule) => rule.reason)).size === 1 ? blocked[0].reason : null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
      <p className="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-500">
        {account.relation}
        {account.isTeam ? " · team account" : ""}
        {account.isStaff ? ` · staff${account.staffRole ? ` (${account.staffRole})` : ""}` : ""}
      </p>
      {account.summary ? (
        <StaffStandingSummary account={account.summary} compact />
      ) : (
        <p className="text-sm text-zinc-300">{account.name}</p>
      )}
      {account.team ? (
        <p className="mt-2 text-[11px] text-zinc-400">
          {account.team.leader ? (
            <>
              Leader: <span className="text-zinc-200">{account.team.leader.name}</span>
              {account.team.leader.handle ? ` @${account.team.leader.handle}` : ""} · {account.team.leader.status}
              {account.team.leader.forumTimeout ? " · timed out" : ""}
            </>
          ) : (
            <span className="text-amber-200">No active leader. Pick specific members or all members when acting.</span>
          )}
          {account.team.memberMerit?.members ? (
            <span className="block">
              Team merit:{" "}
              <span className="text-zinc-200">{account.team.memberMerit.percent ?? "—"}%</span> (
              {account.team.memberMerit.total}/{account.team.memberMerit.max} across {account.team.memberMerit.members} member
              {account.team.memberMerit.members === 1 ? "" : "s"})
              {account.team.memberMerit.below60 ? ` · ${account.team.memberMerit.below60} at low merit` : ""}
            </span>
          ) : null}
        </p>
      ) : null}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {ACCOUNT_ACTION_ORDER.map((id) => {
          const rule = account.actions[id];
          return (
            <button
              key={id}
              type="button"
              disabled={!rule.allowed}
              title={rule.allowed ? rule.note || undefined : rule.reason || undefined}
              onClick={() => onAction(account.accountId, id)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-35 ${
                id === "ban" || id === "suspend"
                  ? "border-rose-400/30 text-rose-100 hover:bg-rose-400/10"
                  : "border-white/10 text-zinc-200 hover:bg-white/[0.06]"
              }`}
            >
              {ACCOUNT_ACTION_LABELS[id]}
            </button>
          );
        })}
      </div>
      {sharedReason ? <p className="mt-2 text-[11px] text-zinc-500">{sharedReason}</p> : null}
      {!allBlocked && blocked.length ? (
        <p className="mt-2 text-[11px] text-zinc-600">Hover a greyed-out action to see why it is off.</p>
      ) : null}
      {userTeamHref && !account.missing ? (
        <Link
          to={userTeamHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
        >
          Open User &amp; Team <ExternalLink className="h-3 w-3" />
        </Link>
      ) : null}
    </div>
  );
}

/**
 * Console side of platform view moderation. Follows the page the frame shows (or the item
 * picked on it), asks the server what it is and what this staff member may do, and opens the
 * action dialog. Everything shown is the server's answer; the frame only supplies a path.
 */
export default function PlatformModerationPanel({
  consolePath,
  path,
  pick,
  picking,
  onStartPick,
  onCancelPick,
  onClearPick,
  onOpenPage,
  onClose,
}: {
  consolePath: string;
  path: string;
  pick: string | null;
  picking: boolean;
  onStartPick: () => void;
  onCancelPick: () => void;
  onClearPick: () => void;
  onOpenPage: (memberPath: string) => void;
  onClose: () => void;
}) {
  const links = consoleLinks(consolePath);
  const [context, setContext] = useState<ModerationContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ context: ModerationContext; pick: string | null; start: ActionDialogStart } | null>(null);
  const [result, setResult] = useState<ModerationActionResult | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!path) return;
    const requestId = ++requestRef.current;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      fetchModerationContext(path, pick, controller.signal)
        .then((next) => {
          // Only the newest request may update the panel: a slow answer about the previous
          // page must never show up next to the current one.
          if (requestId !== requestRef.current) return;
          setContext(next);
          setExpanded(false);
        })
        .catch((err) => {
          if (controller.signal.aborted || requestId !== requestRef.current) return;
          const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setError(message || "Could not load moderation details for this page.");
          setContext(null);
        })
        .finally(() => {
          if (requestId === requestRef.current) setLoading(false);
        });
    }, CONTEXT_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [path, pick, reloadKey]);

  // A result describes the item it was taken on; it goes away with that item.
  useEffect(() => {
    setResult(null);
  }, [path, pick]);

  const refresh = useCallback(() => setReloadKey((value) => value + 1), []);

  // Live: reports, standing and other staff actions on the shown item update the panel in
  // place (the expanded state stays). An open action dialog keeps its own copy.
  useStaffLive(
    ["forum", "marketplace", "jobs", "accounts", "teams", "reports", "moderation"],
    async () => {
      if (!path || dialog) return;
      const requestId = ++requestRef.current;
      try {
        const next = await fetchModerationContext(path, pick);
        if (requestId === requestRef.current) {
          setContext(next);
          setError(null);
        }
      } catch {
        // Keep the panel as it is; the next change or a page switch reads it again.
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    },
    { enabled: Boolean(path), delayMs: 1200 },
  );

  const openDialog = (start: ActionDialogStart) => {
    if (!context?.subject) return;
    setDialog({ context, pick, start });
  };

  const onDone = (next: ModerationActionResult) => {
    setDialog(null);
    setResult(next);
    if (next.context) setContext(next.context);
    else refresh();
    if (next.partial) showErrorToast(next.message);
    else showSuccessToast(next.message);
  };

  const subject = context?.subject ?? null;
  const viewer = context?.viewer ?? null;
  const reportsOnItem = context?.reports.filter((report) => report.onSubject) ?? [];
  const otherReports = context?.reports.filter((report) => !report.onSubject) ?? [];
  const contentDeskHref = subject ? links.contentDesk(subject.area) : null;
  const stale = loading && Boolean(context);

  return (
    <aside
      aria-label="Moderate this page"
      className="absolute inset-y-0 right-0 z-20 flex w-full max-w-[380px] flex-col border-l border-white/10 bg-[#0e1018] shadow-2xl lg:static lg:z-auto lg:w-[380px] lg:max-w-none lg:shrink-0 lg:shadow-none"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <ShieldAlert className="h-4 w-4 shrink-0 text-rose-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Moderate</p>
          <p className="truncate text-[11px] text-zinc-500">
            {viewer ? `${viewer.deskLabel} desk · only staff see this` : "Only staff see this"}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh"
          title="Refresh"
          className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
        >
          <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close moderation panel"
          title="Close"
          className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto transition-opacity ${stale ? "opacity-60" : ""}`}>
        {(context?.page.pickable || pick || picking) && (
          <div className="border-b border-white/[0.06] px-4 py-2.5">
            {picking ? (
              <div className="flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-400/[0.07] px-2.5 py-2 text-xs text-rose-50">
                <Crosshair className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1">Click a post or comment on the page. Esc cancels.</span>
                <button type="button" onClick={onCancelPick} className="rounded px-1.5 py-0.5 text-rose-100 hover:bg-rose-400/15">
                  Cancel
                </button>
              </div>
            ) : pick ? (
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <Crosshair className="h-3.5 w-3.5 shrink-0 text-rose-300" />
                <span className="min-w-0 flex-1">Showing the item you picked.</span>
                <button type="button" onClick={onStartPick} className="rounded px-1.5 py-0.5 text-zinc-300 hover:bg-white/[0.06]">
                  Pick another
                </button>
                <button
                  type="button"
                  onClick={onClearPick}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-zinc-300 hover:bg-white/[0.06]"
                >
                  <Undo2 className="h-3 w-3" /> Page
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onStartPick}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.05]"
              >
                <Crosshair className="h-3.5 w-3.5" /> Pick a post or comment on the page
              </button>
            )}
          </div>
        )}

        {result ? (
          <div className="border-b border-white/[0.06] px-4 py-3">
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                result.partial ? "border-amber-500/30 bg-amber-500/[0.07] text-amber-50" : "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-50"
              }`}
            >
              <p className="flex items-start gap-1.5">
                {result.partial ? <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" /> : <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" />}
                <span>{result.message}</span>
              </p>
              {result.reportsOnItem.length ? (
                <p className="mt-1.5 text-[11px] opacity-80">
                  {result.reportsOnItem.length} report(s) on this item are still open ({result.reportsOnItem.join(", ")}). Close them in the
                  report desk so nobody penalises the same thing twice.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {!context && loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-xs text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading this page…
          </div>
        ) : null}

        {error ? (
          <div className="px-4 py-4">
            <Note tone="warn">{error}</Note>
            <button type="button" onClick={refresh} className="mt-2 text-xs text-zinc-300 hover:text-white">
              Try again
            </button>
          </div>
        ) : null}

        {context && !subject ? (
          <div className="space-y-2 px-4 py-4 text-xs text-zinc-400">
            <p>
              {context.page.pickable
                ? "This page lists many items. Pick the post or comment you want to act on."
                : "This page is not about one item. Open a profile, team, discussion, job, gig or asset to act on it."}
            </p>
          </div>
        ) : null}

        {context && subject ? (
          <>
            <Section title={subject.kindLabel}>
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 break-words text-sm font-medium text-white">{subject.title}</p>
                <StatusPill status={subject.statusLabel} />
              </div>
              {subject.excerpt ? (
                <div className="mt-1.5">
                  <p
                    className={`whitespace-pre-wrap border-l-2 border-white/15 pl-2 text-xs text-zinc-300 ${expanded ? "" : "line-clamp-4"}`}
                  >
                    {subject.excerpt}
                  </p>
                  {subject.excerpt.length > 220 ? (
                    <button
                      type="button"
                      onClick={() => setExpanded((value) => !value)}
                      className="mt-1 text-[11px] text-zinc-500 hover:text-zinc-200"
                    >
                      {expanded ? "Show less" : "Show all"}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {subject.facts.length ? (
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                  {subject.facts.map((fact) => (
                    <div key={fact.label} className="min-w-0">
                      <dt className="text-[10px] uppercase tracking-wide text-zinc-600">{fact.label}</dt>
                      <dd className="truncate text-xs text-zinc-300">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <div className="mt-2 space-y-1.5">
                {subject.notes.map((note) => (
                  <Note key={note}>{note}</Note>
                ))}
                {subject.readOnly ? (
                  <Note tone="warn">
                    {subject.readOnly}{" "}
                    {links.disputes ? (
                      <Link to={links.disputes} target="_blank" rel="noopener noreferrer" className="underline">
                        Open Disputes
                      </Link>
                    ) : null}
                  </Note>
                ) : null}
                {subject.available && !subject.inArea && !subject.readOnly ? (
                  <Note tone="warn">
                    This is the {subject.areaLabel || "another"} desk’s area. You can review it here; quick actions are for that desk, Support
                    and Admin.
                  </Note>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                {subject.href && subject.href !== context.path.split(/[?#]/)[0] ? (
                  <button
                    type="button"
                    onClick={() => onOpenPage(subject.href!)}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                  >
                    Open its page <ExternalLink className="h-3 w-3" />
                  </button>
                ) : null}
                {contentDeskHref ? (
                  <Link
                    to={contentDeskHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                  >
                    Open the desk <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : null}
              </div>
            </Section>

            {subject.available && context.contentActions.length ? (
              <Section title="On the item">
                <div className="flex flex-wrap gap-1.5">
                  {context.contentActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      disabled={!action.allowed}
                      title={action.allowed ? action.hint : action.reason || undefined}
                      onClick={() => openDialog({ contentAction: action.id as ContentActionId })}
                      className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
                {context.contentActions.every((action) => !action.allowed) && context.contentActions[0]?.reason ? (
                  <p className="mt-2 text-[11px] text-zinc-500">{context.contentActions[0].reason}</p>
                ) : null}
              </Section>
            ) : null}

            {subject.available ? (
              <Section title="People" count={context.accounts.length}>
                {context.accounts.length ? (
                  <div className="space-y-2">
                    {context.accounts.map((account) => (
                      <AccountCard
                        key={account.accountId}
                        account={account}
                        userTeamHref={links.userTeam}
                        onAction={(accountId, action) => openDialog({ accountId, accountAction: action })}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No account is tied to this item.</p>
                )}
              </Section>
            ) : null}

            {subject.available ? (
              <Section title="Open reports" icon={<FileWarning className="h-3 w-3" />} count={context.reports.length}>
                {context.reports.length ? (
                  <ul className="space-y-1.5">
                    {[...reportsOnItem, ...otherReports].map((report) => {
                      const href = links.report(report);
                      return (
                        <li key={report.id} className="rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate text-zinc-200">
                              {report.number || "Report"} · {report.type || "Report"}
                            </span>
                            <StatusPill status={report.status} />
                          </div>
                          <p className="mt-0.5 text-[11px] text-zinc-500">
                            {report.onSubject ? "On this item" : "Against this account"} · {DESK_LABELS[report.desk] || report.desk} desk ·{" "}
                            {caseWhen(report.createdAt)}
                          </p>
                          {href ? (
                            <Link
                              to={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                            >
                              Open in reports <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            <p className="mt-0.5 text-[11px] text-zinc-600">Handled by the {DESK_LABELS[report.desk] || report.desk} desk.</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-500">No open reports on this item or its people.</p>
                )}
              </Section>
            ) : null}

            {subject.available ? (
              <Section title="Staff actions, last 24 hours" icon={<History className="h-3 w-3" />} count={context.recentActions.length}>
                {context.recentActions.length ? (
                  <ul className="space-y-1.5">
                    {context.recentActions.map((row) => (
                      <li key={row.id} className="text-xs">
                        <p className="text-zinc-200">
                          {row.label}
                          {row.sameSubject ? <span className="ml-1 rounded bg-rose-400/15 px-1 text-[10px] text-rose-100">this item</span> : null}
                          {row.viaPlatformView ? <span className="ml-1 rounded bg-white/[0.06] px-1 text-[10px] text-zinc-400">platform view</span> : null}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {row.actor.name} ({row.actor.role}) · {caseWhen(row.at)}
                        </p>
                        {row.reason ? <p className="text-[11px] text-zinc-400">“{row.reason}”</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-500">Nobody on staff acted on these accounts in the last day.</p>
                )}
              </Section>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Portaled: on phones this panel is a z-20 overlay, and a dialog inside it would sit under the console's z-30 bars. */}
      {dialog
        ? createPortal(
            <div className="staff-console">
              <PlatformModerationActionDialog
                context={dialog.context}
                pick={dialog.pick}
                start={dialog.start}
                onClose={() => setDialog(null)}
                onDone={onDone}
              />
            </div>,
            document.body,
          )
        : null}
    </aside>
  );
}
