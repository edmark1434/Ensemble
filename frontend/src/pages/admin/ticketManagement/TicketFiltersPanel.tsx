import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import {
  TICKET_PRIORITY_OPTIONS,
  TICKET_STATUS_OPTIONS,
  TICKET_TYPE_GROUPS,
} from './ticketTypes';
import {
  countActiveTicketFilters,
  DEFAULT_TICKET_FILTERS,
  TICKET_QUEUE_OPTIONS,
  typesForQueue,
  type TicketFilterState,
  type TicketQueueFilter,
} from './ticketFilterUtils';

const selectCls =
  'w-full rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white outline-none focus:border-white/25';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

type Accent = 'rose' | 'sky' | 'violet' | 'emerald';

const ACCENT_FOCUS: Record<Accent, string> = {
  rose: 'focus:border-rose-500/40',
  sky: 'focus:border-sky-500/40',
  violet: 'focus:border-violet-500/40',
  emerald: 'focus:border-emerald-500/40',
};

const ACCENT_CHIP: Record<Accent, string> = {
  rose: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  sky: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  violet: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
  emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
};

export default function TicketFiltersPanel({
  filters,
  onChange,
  ticketTypes,
  channels,
  accent = 'rose',
  showQueue = true,
  resultCount,
  totalCount,
}: {
  filters: TicketFilterState;
  onChange: (next: TicketFilterState) => void;
  ticketTypes?: string[];
  channels?: string[];
  accent?: Accent;
  /** Admin sees all queues; specialist desks can hide this */
  showQueue?: boolean;
  resultCount?: number;
  totalCount?: number;
}) {
  const active = countActiveTicketFilters(filters);
  const typeChoices =
    filters.queue === 'all'
      ? ticketTypes?.length
        ? ticketTypes
        : [...TICKET_TYPE_GROUPS.flatMap((g) => g.types)]
      : [...typesForQueue(filters.queue)];

  const channelChoices = channels?.length
    ? channels
    : ['web', 'chat', 'email', 'in_app'];

  const patch = (partial: Partial<TicketFilterState>) => onChange({ ...filters, ...partial });

  const clear = () => onChange({ ...DEFAULT_TICKET_FILTERS });

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-[#14151c] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-white">Filters and Search</p>
          {active > 0 && (
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${ACCENT_CHIP[accent]}`}>
              {active} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {typeof resultCount === 'number' && typeof totalCount === 'number' && (
            <span>
              Showing <span className="text-zinc-300">{resultCount}</span> of {totalCount}
            </span>
          )}
          {active > 0 && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={filters.search}
          onChange={(e) => patch({ search: e.target.value })}
          placeholder="Search ticket #, subject, requester, email, account/user id, assignee…"
          className={`w-full rounded-xl border border-white/10 bg-[#0f1016] py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 ${ACCENT_FOCUS[accent]}`}
        />
      </div>

      <div className={`grid gap-3 sm:grid-cols-2 ${showQueue ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} xl:grid-cols-4`}>
        <Field label="Status">
          <select value={filters.status} onChange={(e) => patch({ status: e.target.value })} className={selectCls}>
            <option value="all">All Statuses</option>
            {TICKET_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Priority">
          <select value={filters.priority} onChange={(e) => patch({ priority: e.target.value })} className={selectCls}>
            <option value="all">All Priorities</option>
            {[...TICKET_PRIORITY_OPTIONS].reverse().map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>

        {showQueue && (
          <Field label="Queue">
            <select
              value={filters.queue}
              onChange={(e) => {
                const queue = e.target.value as TicketQueueFilter;
                const allowed = typesForQueue(queue);
                const type =
                  filters.type !== 'all' && !(allowed as readonly string[]).includes(filters.type)
                    ? 'all'
                    : filters.type;
                patch({ queue, type });
              }}
              className={selectCls}
            >
              {TICKET_QUEUE_OPTIONS.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Type">
          <select value={filters.type} onChange={(e) => patch({ type: e.target.value })} className={selectCls}>
            <option value="all">All Types</option>
            {filters.queue === 'all'
              ? TICKET_TYPE_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.types
                      .filter((t) => !ticketTypes?.length || ticketTypes.includes(t))
                      .map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                  </optgroup>
                ))
              : typeChoices.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
          </select>
        </Field>

        <Field label="Assignee">
          <select
            value={filters.assignee}
            onChange={(e) => patch({ assignee: e.target.value as TicketFilterState['assignee'] })}
            className={selectCls}
          >
            <option value="all">Anyone</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </Field>

        <Field label="Flags">
          <select
            value={filters.flag}
            onChange={(e) => patch({ flag: e.target.value as TicketFilterState['flag'] })}
            className={selectCls}
          >
            <option value="all">All Flags</option>
            <option value="awaiting">Awaiting Reply</option>
            <option value="escalated">Escalated</option>
            <option value="open_only">Open / In Progress</option>
          </select>
        </Field>

        <Field label="Channel">
          <select value={filters.channel} onChange={(e) => patch({ channel: e.target.value })} className={selectCls}>
            <option value="all">All Channels</option>
            {channelChoices.map((c) => (
              <option key={c} value={c}>
                {c === 'in_app' ? 'In App' : c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}
