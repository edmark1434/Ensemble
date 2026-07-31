import type { SupportTicket } from './ticketTypes';
import {
  ESCALATE_ROLE_OPTIONS,
  FORUM_TICKET_TYPES,
  JOBS_TICKET_TYPES,
  MARKETPLACE_TICKET_TYPES,
  SUPPORT_TICKET_TYPES,
  TICKET_TYPE_OPTIONS,
  ticketTypeOf,
} from './ticketTypes';

export type TicketQueueFilter = 'all' | 'Support' | 'Forums' | 'Marketplace' | 'Jobs and Gigs' | 'Admin';
export type TicketAssigneeFilter = 'all' | 'assigned' | 'unassigned';
export type TicketFlagFilter = 'all' | 'awaiting' | 'escalated' | 'open_only' | 'has_report' | 'has_dispute';
export type TicketSortKey = 'priority_desc' | 'priority_asc' | 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc';
export type TicketDesk = 'admin' | 'support';

export type TicketFilterState = {
  search: string;
  status: string;
  priority: string;
  type: string;
  queue: TicketQueueFilter;
  assignee: TicketAssigneeFilter;
  /** Specific staff id, or 'all' */
  assigneeStaffId: string;
  /** Escalated-to role filter, or 'all' */
  escalatedToRole: string;
  flag: TicketFlagFilter;
  channel: string;
  /** Admin desk only: show only Admin-owned tickets */
  adminTicketsOnly: boolean;
  sort: TicketSortKey;
};

export const DEFAULT_TICKET_FILTERS: TicketFilterState = {
  search: '',
  status: 'all',
  priority: 'all',
  type: 'all',
  queue: 'all',
  assignee: 'all',
  assigneeStaffId: 'all',
  escalatedToRole: 'all',
  flag: 'all',
  channel: 'all',
  adminTicketsOnly: false,
  sort: 'priority_desc',
};

export const TICKET_QUEUE_OPTIONS: { value: TicketQueueFilter; label: string; types: readonly string[] }[] = [
  { value: 'all', label: 'All Queues', types: TICKET_TYPE_OPTIONS },
  { value: 'Support', label: 'Support', types: SUPPORT_TICKET_TYPES },
  { value: 'Forums', label: 'Forums', types: FORUM_TICKET_TYPES },
  { value: 'Marketplace', label: 'Marketplace', types: MARKETPLACE_TICKET_TYPES },
  { value: 'Jobs and Gigs', label: 'Jobs and Gigs', types: JOBS_TICKET_TYPES },
  { value: 'Admin', label: 'Admin', types: TICKET_TYPE_OPTIONS },
];

/** Queues visible on each desk (Support never owns Admin tickets). */
export function queueOptionsForDesk(desk: TicketDesk) {
  if (desk === 'support') {
    return TICKET_QUEUE_OPTIONS.filter((q) => q.value !== 'Admin');
  }
  return TICKET_QUEUE_OPTIONS;
}

export function isAdminStaffRole(role: string | null | undefined) {
  const r = String(role || '').toLowerCase();
  return r === 'admin' || r === 'administrator';
}

/** Escalate-to options for filters — Support cannot target Admin. */
export function escalateRoleFilterOptions(desk: TicketDesk): readonly string[] {
  if (desk === 'support') {
    return ESCALATE_ROLE_OPTIONS.filter((r) => !isAdminStaffRole(r));
  }
  return ESCALATE_ROLE_OPTIONS;
}

export function filterModeratorsForDesk(
  moderators: { staffId: number | string; name: string; role: string }[],
  desk: TicketDesk
) {
  if (desk === 'support') {
    return moderators.filter((m) => !isAdminStaffRole(m.role));
  }
  return moderators;
}

export const TICKET_SORT_OPTIONS: { value: TicketSortKey; label: string }[] = [
  { value: 'priority_desc', label: 'Priority (High → Low)' },
  { value: 'priority_asc', label: 'Priority (Low → High)' },
  { value: 'updated_desc', label: 'Updated (Newest)' },
  { value: 'updated_asc', label: 'Updated (Oldest)' },
  { value: 'created_desc', label: 'Created (Newest)' },
  { value: 'created_asc', label: 'Created (Oldest)' },
];

const PRIORITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

export function typesForQueue(queue: TicketQueueFilter): readonly string[] {
  return TICKET_QUEUE_OPTIONS.find((q) => q.value === queue)?.types || TICKET_TYPE_OPTIONS;
}

export function queueForType(type: string): TicketQueueFilter {
  const t = String(type || '');
  if ((SUPPORT_TICKET_TYPES as readonly string[]).includes(t)) return 'Support';
  if ((FORUM_TICKET_TYPES as readonly string[]).includes(t)) return 'Forums';
  if ((MARKETPLACE_TICKET_TYPES as readonly string[]).includes(t)) return 'Marketplace';
  if ((JOBS_TICKET_TYPES as readonly string[]).includes(t)) return 'Jobs and Gigs';
  return 'all';
}

function isAdminRole(role: string | null | undefined) {
  return isAdminStaffRole(role);
}

export function isAdminTicket(ticket: SupportTicket): boolean {
  if (isAdminRole(ticket.escalatedToRole)) return true;
  if (isAdminRole(ticket.assignee?.role)) return true;
  return false;
}

export function ticketMatchesSearch(ticket: SupportTicket, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    ticket.number,
    ticket.subject,
    ticket.reason,
    ticketTypeOf(ticket),
    ticket.status,
    ticket.priority,
    ticket.channel,
    ticket.requester?.name,
    ticket.requester?.username,
    ticket.requester?.email,
    ticket.requester?.accountId,
    ticket.requester?.userId,
    ticket.assignee?.name,
    ticket.assignee?.role,
    ticket.escalatedBy?.name,
    ticket.escalatedBy?.role,
    ticket.escalatedToRole,
    ticket.relatedReportId,
    ticket.relatedDisputeId,
    ticket.messageCount,
    ticket.id,
  ]
    .filter((v) => v != null && v !== '')
    .map((v) => String(v).toLowerCase());

  return haystack.some((h) => h.includes(q));
}

export function sortTickets(tickets: SupportTicket[], sort: TicketSortKey): SupportTicket[] {
  const list = [...tickets];
  const time = (v: string | null | undefined) => (v ? new Date(v).getTime() : 0);
  list.sort((a, b) => {
    switch (sort) {
      case 'priority_asc':
        return (
          (PRIORITY_RANK[b.priority] ?? -1) - (PRIORITY_RANK[a.priority] ?? -1) ||
          time(b.updatedAt) - time(a.updatedAt)
        );
      case 'priority_desc':
        return (
          (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) ||
          time(b.updatedAt) - time(a.updatedAt)
        );
      case 'updated_asc':
        return time(a.updatedAt) - time(b.updatedAt);
      case 'updated_desc':
        return time(b.updatedAt) - time(a.updatedAt);
      case 'created_asc':
        return time(a.createdAt) - time(b.createdAt);
      case 'created_desc':
        return time(b.createdAt) - time(a.createdAt);
      default:
        return 0;
    }
  });
  return list;
}

export function filterTickets(tickets: SupportTicket[], filters: TicketFilterState): SupportTicket[] {
  const queueTypes = new Set(typesForQueue(filters.queue));

  const filtered = tickets.filter((t) => {
    if (filters.adminTicketsOnly && !isAdminTicket(t)) return false;

    if (filters.queue === 'Admin') {
      if (!isAdminTicket(t)) return false;
    } else if (filters.queue !== 'all' && !queueTypes.has(ticketTypeOf(t))) {
      return false;
    }

    if (filters.status !== 'all' && t.status !== filters.status) return false;
    if (filters.priority !== 'all' && t.priority !== filters.priority) return false;

    const type = ticketTypeOf(t);
    if (filters.type !== 'all' && type !== filters.type) return false;

    if (filters.assignee === 'assigned' && !t.assignee) return false;
    if (filters.assignee === 'unassigned' && t.assignee) return false;
    if (
      filters.assigneeStaffId !== 'all' &&
      String(t.assignee?.staffId || '').toLowerCase() !== String(filters.assigneeStaffId).toLowerCase()
    ) {
      return false;
    }

    if (filters.escalatedToRole !== 'all') {
      if (String(t.escalatedToRole || '') !== filters.escalatedToRole) return false;
    }

    if (filters.flag === 'awaiting' && !t.waitingForResponse) return false;
    if (filters.flag === 'escalated' && !t.isEscalated) return false;
    if (filters.flag === 'has_report' && !t.relatedReportId) return false;
    if (filters.flag === 'has_dispute' && !t.relatedDisputeId) return false;
    if (filters.flag === 'open_only' && t.status !== 'Open' && t.status !== 'In Progress') {
      return false;
    }

    if (filters.channel !== 'all') {
      const ch = String(t.channel || 'web').toLowerCase();
      if (ch !== filters.channel.toLowerCase()) return false;
    }

    if (!ticketMatchesSearch(t, filters.search)) return false;
    return true;
  });

  return sortTickets(filtered, filters.sort);
}

export function countActiveTicketFilters(filters: TicketFilterState): number {
  let n = 0;
  if (filters.search.trim()) n += 1;
  if (filters.status !== 'all') n += 1;
  if (filters.priority !== 'all') n += 1;
  if (filters.type !== 'all') n += 1;
  if (filters.queue !== 'all') n += 1;
  if (filters.assignee !== 'all') n += 1;
  if (filters.assigneeStaffId !== 'all') n += 1;
  if (filters.escalatedToRole !== 'all') n += 1;
  if (filters.flag !== 'all') n += 1;
  if (filters.channel !== 'all') n += 1;
  // Admin queue already counted; don't double-count the toggle when queue is Admin
  if (filters.adminTicketsOnly && filters.queue !== 'Admin') n += 1;
  if (filters.sort !== DEFAULT_TICKET_FILTERS.sort) n += 1;
  return n;
}

export function formatEscalatedLabel(ticket: SupportTicket): string {
  if (!ticket.isEscalated && !ticket.escalatedToRole) return '';
  const to = ticket.escalatedToRole ? `to ${ticket.escalatedToRole}` : '';
  const by = ticket.escalatedBy?.name ? `by ${ticket.escalatedBy.name}` : '';
  if (to && by) return `Escalated ${to} · ${by}`;
  if (to) return `Escalated ${to}`;
  if (by) return `Escalated ${by}`;
  return 'Escalated';
}
