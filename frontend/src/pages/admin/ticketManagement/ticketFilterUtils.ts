import type { SupportTicket } from './ticketTypes';
import {
  FORUM_TICKET_TYPES,
  JOBS_TICKET_TYPES,
  MARKETPLACE_TICKET_TYPES,
  SUPPORT_TICKET_TYPES,
  TICKET_TYPE_OPTIONS,
  ticketTypeOf,
} from './ticketTypes';

export type TicketQueueFilter = 'all' | 'Support' | 'Forums' | 'Marketplace' | 'Jobs and Gigs';
export type TicketAssigneeFilter = 'all' | 'assigned' | 'unassigned';
export type TicketFlagFilter = 'all' | 'awaiting' | 'escalated' | 'open_only';

export type TicketFilterState = {
  search: string;
  status: string;
  priority: string;
  type: string;
  queue: TicketQueueFilter;
  assignee: TicketAssigneeFilter;
  flag: TicketFlagFilter;
  channel: string;
};

export const DEFAULT_TICKET_FILTERS: TicketFilterState = {
  search: '',
  status: 'all',
  priority: 'all',
  type: 'all',
  queue: 'all',
  assignee: 'all',
  flag: 'all',
  channel: 'all',
};

export const TICKET_QUEUE_OPTIONS: { value: TicketQueueFilter; label: string; types: readonly string[] }[] = [
  { value: 'all', label: 'All Queues', types: TICKET_TYPE_OPTIONS },
  { value: 'Support', label: 'Support', types: SUPPORT_TICKET_TYPES },
  { value: 'Forums', label: 'Forums', types: FORUM_TICKET_TYPES },
  { value: 'Marketplace', label: 'Marketplace', types: MARKETPLACE_TICKET_TYPES },
  { value: 'Jobs and Gigs', label: 'Jobs and Gigs', types: JOBS_TICKET_TYPES },
];

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
    ticket.id,
  ]
    .filter((v) => v != null && v !== '')
    .map((v) => String(v).toLowerCase());

  return haystack.some((h) => h.includes(q));
}

export function filterTickets(tickets: SupportTicket[], filters: TicketFilterState): SupportTicket[] {
  const queueTypes = new Set(typesForQueue(filters.queue));

  return tickets.filter((t) => {
    if (filters.status !== 'all' && t.status !== filters.status) return false;
    if (filters.priority !== 'all' && t.priority !== filters.priority) return false;

    const type = ticketTypeOf(t);
    if (filters.queue !== 'all' && !queueTypes.has(type)) return false;
    if (filters.type !== 'all' && type !== filters.type) return false;

    if (filters.assignee === 'assigned' && !t.assignee) return false;
    if (filters.assignee === 'unassigned' && t.assignee) return false;

    if (filters.flag === 'awaiting' && !t.waitingForResponse) return false;
    if (filters.flag === 'escalated' && !t.isEscalated) return false;
    if (
      filters.flag === 'open_only' &&
      t.status !== 'Open' &&
      t.status !== 'In Progress'
    ) {
      return false;
    }

    if (filters.channel !== 'all') {
      const ch = String(t.channel || 'web').toLowerCase();
      if (ch !== filters.channel.toLowerCase()) return false;
    }

    if (!ticketMatchesSearch(t, filters.search)) return false;
    return true;
  });
}

export function countActiveTicketFilters(filters: TicketFilterState): number {
  let n = 0;
  if (filters.search.trim()) n += 1;
  if (filters.status !== 'all') n += 1;
  if (filters.priority !== 'all') n += 1;
  if (filters.type !== 'all') n += 1;
  if (filters.queue !== 'all') n += 1;
  if (filters.assignee !== 'all') n += 1;
  if (filters.flag !== 'all') n += 1;
  if (filters.channel !== 'all') n += 1;
  return n;
}
