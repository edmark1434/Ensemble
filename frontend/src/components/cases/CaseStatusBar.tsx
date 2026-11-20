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
 * Compact upper-left icon badge for open cases (disputes / member-waiting tickets).
 * Smoothly expands on hover to show case details and opens the case on click.
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
  const [expanded, setExpanded] = useState(false);

  // Tickets that are just with support do not need a site-wide bar; disputes always do.
  const relevant = summary.items.filter((item) => item.kind === 'dispute' || item.access.needsYou);
  const primary = relevant[0];
  if (!primary || dismissed === key) return null;

  const tone = toneClasses(primary.access.needsYou ? 'amber' : 'sky');
  const Icon = primary.kind === 'dispute' ? Scale : LifeBuoy;
  const openCount = summary.openDisputes + summary.openTickets;
  const others = Math.max(0, openCount - 1);
  const detail = primary.access.attention || primary.access.stageLabel;

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`pointer-events-auto flex w-fit items-center rounded-xl border bg-white/95 p-1.5 shadow-lg backdrop-blur-md transition-all duration-300 ease-out dark:bg-[#15161b]/95 ${tone.border}`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <button
        type="button"
        onClick={() => onOpen(primary)}
        title={`${caseLabel(primary.kind, primary.number)} — ${detail}`}
        className="flex min-w-0 items-center text-left cursor-pointer"
      >
        <span className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}>
          <Icon className="h-3.5 w-3.5" />
          <span
            className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-white dark:ring-[#15161b] ${
              primary.access.needsYou ? 'bg-amber-500' : 'bg-sky-500'
            }`}
          />
        </span>

        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            expanded ? 'ml-2 max-w-[240px] opacity-100' : 'ml-0 max-w-0 opacity-0'
          }`}
        >
          <div className="whitespace-nowrap pr-1 leading-tight">
            <div className="text-[11px] font-bold text-zinc-900 dark:text-white">
              {caseLabel(primary.kind, primary.number)}
            </div>
            <div className="truncate text-[10.5px] font-medium text-zinc-500 dark:text-zinc-400">
              {detail}
              {others > 0 ? ` · +${others}` : ''}
            </div>
          </div>
        </div>
      </button>

      <div
        className={`flex items-center overflow-hidden transition-all duration-300 ease-out ${
          expanded ? 'ml-1.5 max-w-[90px] opacity-100' : 'ml-0 max-w-0 opacity-0'
        }`}
      >
        {others > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAll();
            }}
            className="mr-1 shrink-0 rounded-lg border border-zinc-200 px-2 py-1 text-[10.5px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/5 cursor-pointer"
          >
            All
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Hide until something changes"
          onClick={(e) => {
            e.stopPropagation();
            writeDismissed(key);
            setDismissed(key);
          }}
          className="shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
