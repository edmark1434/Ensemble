import { useMemo, useState, type ReactNode } from 'react';
import { Search, Shield, X } from 'lucide-react';
import {
  ESCALATE_ROLE_OPTIONS,
  TICKET_PRIORITY_OPTIONS,
  TICKET_STATUS_OPTIONS,
  TICKET_TYPE_GROUPS,
} from './ticketTypes';
import {
  countActiveTicketFilters,
  DEFAULT_TICKET_FILTERS,
  TICKET_QUEUE_OPTIONS,
  TICKET_SORT_OPTIONS,
  typesForQueue,
  type TicketFilterState,
  type TicketQueueFilter,
  type TicketSortKey,
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

const ACCENT_BTN: Record<Accent, string> = {
  rose: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
  sky: 'border-sky-500/40 bg-sky-500/15 text-sky-200',
  violet: 'border-violet-500/40 bg-violet-500/15 text-violet-200',
  emerald: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
};

export type ModeratorOption = {
  staffId: number | string;
  name: string;
  role: string;
};

export default function TicketFiltersPanel({
  filters,
  onChange,
  ticketTypes,
  channels,
  moderators = [],
  accent = 'rose',
  showQueue = true,
  showAdminToggle = false,
  resultCount,
  totalCount,
}: {
  filters: TicketFilterState;
  onChange: (next: TicketFilterState) => void;
  ticketTypes?: string[];
  channels?: string[];
  moderators?: ModeratorOption[];
  accent?: Accent;
  showQueue?: boolean;
  showAdminToggle?: boolean;
  resultCount?: number;
  totalCount?: number;
}) {
  const [moderatorSearch, setModeratorSearch] = useState('');
  const active = countActiveTicketFilters(filters);
  const typeChoices =
    filters.queue === 'all'
      ? ticketTypes?.length
        ? ticketTypes
        : [...TICKET_TYPE_GROUPS.flatMap((g) => g.types)]
      : [...typesForQueue(filters.queue)];

  const channelChoices = channels?.length ? channels : ['web', 'chat', 'email', 'in_app'];

  const filteredMods = useMemo(() => {
    const q = moderatorSearch.trim().toLowerCase();
    if (!q) return moderators;
    return moderators.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        String(m.staffId).toLowerCase().includes(q)
    );
  }, [moderators, moderatorSearch]);

  const patch = (partial: Partial<TicketFilterState>) => onChange({ ...filters, ...partial });
  const clear = () => {
    setModeratorSearch('');
    onChange({ ...DEFAULT_TICKET_FILTERS });
  };

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
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          {typeof resultCount === 'number' && typeof totalCount === 'number' && (
            <span>
              Showing <span className="text-zinc-300">{resultCount}</span> of {totalCount}
            </span>
          )}
          {showAdminToggle && (
            <button
              type="button"
              onClick={() => patch({ adminTicketsOnly: !filters.adminTicketsOnly })}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                filters.adminTicketsOnly
                  ? ACCENT_BTN[accent]
                  : 'border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              {filters.adminTicketsOnly ? 'Showing Admin Tickets' : 'Show Admin Tickets'}
            </button>
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
          placeholder="Search ticket #, subject, requester, email, ids, assignee, escalated to/by…"
          className={`w-full rounded-xl border border-white/10 bg-[#0f1016] py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 ${ACCENT_FOCUS[accent]}`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

        <Field label="Sort">
          <select
            value={filters.sort}
            onChange={(e) => patch({ sort: e.target.value as TicketSortKey })}
            className={selectCls}
          >
            {TICKET_SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
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

        <Field label="Assignee Status">
          <select
            value={filters.assignee}
            onChange={(e) =>
              patch({
                assignee: e.target.value as TicketFilterState['assignee'],
                assigneeStaffId: e.target.value === 'unassigned' ? 'all' : filters.assigneeStaffId,
              })
            }
            className={selectCls}
          >
            <option value="all">Anyone</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </Field>

        <Field label="Moderator / Assignee">
          <div className="space-y-1.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
              <input
                value={moderatorSearch}
                onChange={(e) => setModeratorSearch(e.target.value)}
                placeholder="Search moderators…"
                className="w-full rounded-lg border border-white/10 bg-[#0f1016] py-2 pl-8 pr-2 text-xs text-white outline-none placeholder:text-zinc-600"
              />
            </div>
            <select
              value={filters.assigneeStaffId}
              onChange={(e) =>
                patch({
                  assigneeStaffId: e.target.value,
                  assignee: e.target.value === 'all' ? filters.assignee : 'assigned',
                })
              }
              className={selectCls}
            >
              <option value="all">All Moderators</option>
              {filteredMods.map((m) => (
                <option key={String(m.staffId)} value={String(m.staffId)}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </div>
        </Field>

        <Field label="Escalated To">
          <select
            value={filters.escalatedToRole}
            onChange={(e) => patch({ escalatedToRole: e.target.value })}
            className={selectCls}
          >
            <option value="all">Any Queue</option>
            {ESCALATE_ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
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
            <option value="has_report">Has Related Report</option>
            <option value="has_dispute">Has Related Dispute</option>
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
