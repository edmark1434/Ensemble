import { useState } from 'react';
import { LifeBuoy, Scale, X } from 'lucide-react';
import { toneClasses } from '@/components/account/StandingDetails';
import { caseLabel, type CaseSummary, type CaseSummaryItem } from '@/lib/cases';

const DISMISS_KEY = 'ensemble:case-bar-dismissed';

/** Changes whenever a case opens, closes, moves stage, or starts or stops waiting on the member. */
function summaryKey(summary: CaseSummary) {
  return summary.items
    .map((item) => `${item.kind}:${item.id}:${item.access.status}:${item.access.visibility ? 1 : 0}:${item.access.needsYou ? 1 : 0}`)
    .join('|');
}

function readDismissed() {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) || '';
  } catch {
    return '';
  }
}

function writeDismissed(value: string) {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, value);
  } catch {
    // Private mode: the bar simply comes back on the next page.
  }
}

/**
 * Site-wide bar for open cases, next to the standing bar: an open dispute (credits are on hold
 * while one runs) or a ticket or dispute that is waiting on the member. Shows the most urgent
 * one; hiding it lasts until something about the member's cases changes.
 */
export function CaseStatusBar({
  summary,
  onOpen,
  onOpenAll,
}: {
  summary: CaseSummary;
  onOpen: (item: CaseSummaryItem) => void;
  onOpenAll: () => void;
}) {
  const key = summaryKey(summary);
  const [dismissed, setDismissed] = useState(() => readDismissed());

  // Tickets that are just with support do not need a site-wide bar; disputes always do.
  const relevant = summary.items.filter((item) => item.kind === 'dispute' || item.access.needsYou);
  const primary = relevant[0];
  if (!primary || dismissed === key) return null;

  const tone = toneClasses(primary.access.needsYou ? 'amber' : 'sky');
  const Icon = primary.kind === 'dispute' ? Scale : LifeBuoy;
  const openCount = summary.openDisputes + summary.openTickets;
  const others = Math.max(0, openCount - 1);
  const detail = primary.access.attention || primary.access.stageLabel;
  const action = primary.access.needsYou && primary.access.canReply ? 'Reply' : 'Open';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex w-full max-w-2xl items-center justify-between gap-2.5 rounded-xl border bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-md dark:bg-[#15161b]/95 ${tone.border}`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <button type="button" onClick={() => onOpen(primary)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}>
          <Icon className="h-3.5 w-3.5" />
          {primary.access.needsYou ? (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-[#15161b]" />
          ) : null}
        </span>
        <span className="shrink-0 text-xs font-bold text-zinc-900 dark:text-white">
          {caseLabel(primary.kind, primary.number)}
        </span>
        <span className="truncate text-xs font-medium text-zinc-600 dark:text-zinc-300">
          {detail}
          {others > 0 ? ` · ${others} more open` : ''}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onOpen(primary)}
        className="inline-flex shrink-0 items-center rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:text-white dark:hover:bg-white/5"
      >
        {action}
      </button>
      {others > 0 ? (
        <button
          type="button"
          onClick={onOpenAll}
          className="hidden shrink-0 items-center rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:text-white dark:hover:bg-white/5 sm:inline-flex"
        >
          All cases
        </button>
      ) : null}
      <button
        type="button"
        aria-label="Hide until something changes"
        onClick={() => {
          writeDismissed(key);
          setDismissed(key);
        }}
        className="shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
