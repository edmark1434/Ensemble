import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import api from '@/lib/axios';
import useGlobalState from '@/lib/global_state';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import {
  DEFAULT_TICKET_PRIORITY,
  ESCALATE_TYPES_BY_ROLE,
  TICKET_PRIORITY_OPTIONS,
  TICKET_TYPE_DESCRIPTIONS,
  TICKET_TYPE_GROUPS,
  escalateTypesForRole,
} from './ticketTypes';

type Accent = 'rose' | 'sky' | 'violet' | 'emerald';

type PersonHit = {
  accountId: string;
  name: string;
  handle: string;
  email: string;
  kind: 'staff' | 'user';
  role: string;
};

const ACCENT_BTN: Record<Accent, string> = {
  rose: 'bg-rose-500 hover:bg-rose-400',
  sky: 'bg-sky-500 hover:bg-sky-400',
  violet: 'bg-violet-500 hover:bg-violet-400',
  emerald: 'bg-emerald-500 hover:bg-emerald-400',
};

const ACCENT_FOCUS: Record<Accent, string> = {
  rose: 'focus:border-rose-500/40',
  sky: 'focus:border-sky-500/40',
  violet: 'focus:border-violet-500/40',
  emerald: 'focus:border-emerald-500/40',
};

function apiErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  );
}

function queueRoleForType(type: string) {
  for (const [role, types] of Object.entries(ESCALATE_TYPES_BY_ROLE)) {
    if (role === 'Admin' || role === 'Administrator') continue;
    if ((types as readonly string[]).includes(type)) return role;
  }
  return 'Support Moderator';
}

function fieldClass(accent: Accent) {
  return `w-full rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 ${ACCENT_FOCUS[accent]}`;
}

export default function CreateTicketForUserModal({
  onClose,
  onCreated,
  accent = 'rose',
  defaultTypes,
}: {
  onClose: () => void;
  onCreated: (ticketId: string | number) => void;
  accent?: Accent;
  defaultTypes?: readonly string[];
}) {
  const user = useGlobalState((state) => state.user);
  const staffRole = String(user?.role || '');
  const initialType = defaultTypes?.[0] || TICKET_TYPE_GROUPS[0]?.types[0] || 'Other';

  const [personQuery, setPersonQuery] = useState('');
  const [personResults, setPersonResults] = useState<PersonHit[]>([]);
  const [searchingPeople, setSearchingPeople] = useState(false);
  const [requester, setRequester] = useState<PersonHit | null>(null);
  const [subject, setSubject] = useState('');
  const [ticketType, setTicketType] = useState(initialType);
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>(
    DEFAULT_TICKET_PRIORITY[initialType] || 'Medium'
  );
  const [description, setDescription] = useState('');
  const [assignToMe, setAssignToMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const handleableTypes = useMemo(() => {
    const fromRole = escalateTypesForRole(staffRole);
    if (fromRole.length) return new Set(fromRole);
    return new Set<string>();
  }, [staffRole]);
  const canAssignToMe = handleableTypes.has(ticketType);
  const typeDescription = TICKET_TYPE_DESCRIPTIONS[ticketType] || '';
  const queueRole = queueRoleForType(ticketType);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  useEffect(() => {
    const query = personQuery.replace(/^@/, '').trim();
    if (requester || query.length < 2) {
      setPersonResults([]);
      setSearchingPeople(false);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchingPeople(true);
      try {
        const response = await api.get('/api/staff/tickets/people', {
          params: { q: query },
          signal: controller.signal,
        });
        const results = (response.data?.data || []).map((account: {
          accountId: string;
          name?: string;
          handle?: string | null;
          email?: string | null;
          kind?: 'user' | 'staff';
          role?: string;
        }) => ({
          accountId: String(account.accountId),
          name: account.name || account.handle || 'Unknown',
          handle: account.handle ? `@${account.handle}` : '',
          email: account.email || '',
          kind: account.kind === 'staff' ? ('staff' as const) : ('user' as const),
          role: account.role || (account.kind === 'staff' ? 'Staff' : 'User'),
        }));
        setPersonResults(results);
      } catch (err: unknown) {
        if ((err as { code?: string; name?: string })?.code === 'ERR_CANCELED' || (err as { name?: string })?.name === 'CanceledError') {
          return;
        }
        setPersonResults([]);
      } finally {
        if (!controller.signal.aborted) setSearchingPeople(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [personQuery, requester]);

  const chooseType = (nextType: string) => {
    setTicketType(nextType);
    setPriority(DEFAULT_TICKET_PRIORITY[nextType] || 'Medium');
    if (!escalateTypesForRole(staffRole).includes(nextType)) setAssignToMe(false);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!requester?.accountId) next.requester = 'Choose the member this ticket is for.';
    if (!subject.trim()) next.subject = 'Subject is required.';
    else if (subject.trim().length > 200) next.subject = 'Subject must be 200 characters or less.';
    if (!ticketType) next.type = 'Pick a ticket type.';
    if (!description.trim()) next.description = 'Description is required.';
    else if (description.trim().length < 10) next.description = 'Description must be at least 10 characters.';
    else if (description.trim().length > 5000) next.description = 'Description must be 5,000 characters or less.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      const response = await api.post('/api/staff/tickets', {
        requesterAccountId: requester?.accountId,
        subject: subject.trim(),
        type: ticketType,
        priority,
        description: description.trim(),
        assignToMe: canAssignToMe && assignToMe,
      });
      if (!response.data?.success) {
        setFormError(response.data?.message || 'Failed to create ticket');
        return;
      }
      const ticketId = response.data?.data?.ticket?.id as string | number | undefined;
      showSuccessToast(response.data?.message || 'Ticket opened');
      if (ticketId != null) onCreated(ticketId);
      else onClose();
    } catch (err: unknown) {
      const message = apiErrorMessage(err, 'Failed to create ticket');
      setFormError(message);
      showErrorToast(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:pl-[260px]">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={submitting ? undefined : onClose} aria-label="Close" />
      <form
        onSubmit={submit}
        className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12131a] shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-white/[0.08] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Create ticket</h2>
            <p className="mt-1 text-xs text-zinc-500">Open a support ticket on a member's account.</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg p-2 text-zinc-400 hover:text-white disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label className="block text-[11px] text-zinc-500" htmlFor="staff-ticket-person">
              Member
            </label>
            {requester ? (
              <div className="mt-1.5 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{requester.name}</p>
                  <p className="truncate text-[11px] text-zinc-500">
                    {requester.handle || 'No handle'}
                    {requester.email ? ` · ${requester.email}` : ''}
                    {` · ${requester.role}`}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setRequester(null);
                    setPersonQuery('');
                  }}
                  className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/5"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  id="staff-ticket-person"
                  value={personQuery}
                  onChange={(event) => setPersonQuery(event.target.value)}
                  placeholder="Name, @handle, or email"
                  autoComplete="off"
                  className={`mt-1.5 ${fieldClass(accent)}`}
                />
                {personQuery.replace(/^@/, '').trim().length === 1 && (
                  <p className="mt-1 text-[11px] text-zinc-500">Type at least 2 characters.</p>
                )}
                {searchingPeople && <p className="mt-1 text-[11px] text-zinc-500">Searching…</p>}
                {personResults.length > 0 && (
                  <ul className="mt-1.5 max-h-48 space-y-1 overflow-y-auto">
                    {personResults.map((person) => (
                      <li key={person.accountId}>
                        <button
                          type="button"
                          onClick={() => {
                            setRequester(person);
                            setPersonQuery('');
                            setPersonResults([]);
                            setErrors((current) => ({ ...current, requester: '' }));
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-xs hover:bg-white/5"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-white">{person.name}</span>
                            <span className="block truncate text-zinc-500">
                              {person.handle || 'No handle'}
                              {person.email ? ` · ${person.email}` : ''}
                            </span>
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] ${
                              person.kind === 'staff' ? 'border-violet-400/40 text-violet-200' : 'border-white/15 text-zinc-400'
                            }`}
                          >
                            {person.role}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {!searchingPeople && personQuery.replace(/^@/, '').trim().length >= 2 && personResults.length === 0 && (
                  <p className="mt-1 text-[11px] text-zinc-500">No matching members or staff.</p>
                )}
              </>
            )}
            {errors.requester && <p className="mt-1 text-[11px] text-rose-300">{errors.requester}</p>}
          </div>

          <div>
            <label className="block text-[11px] text-zinc-500" htmlFor="staff-ticket-subject">
              Subject
            </label>
            <input
              id="staff-ticket-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={200}
              placeholder="Short summary of the issue"
              className={`mt-1.5 ${fieldClass(accent)}`}
            />
            {errors.subject && <p className="mt-1 text-[11px] text-rose-300">{errors.subject}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] text-zinc-500" htmlFor="staff-ticket-type">
                Type
              </label>
              <select
                id="staff-ticket-type"
                value={ticketType}
                onChange={(event) => chooseType(event.target.value)}
                className={`mt-1.5 ${fieldClass(accent)}`}
              >
                {TICKET_TYPE_GROUPS.map((group) =>
                  group.subgroups?.length
                    ? group.subgroups.map((subgroup) => (
                        <optgroup key={`${group.label}-${subgroup.label}`} label={`${group.label} · ${subgroup.label}`}>
                          {subgroup.types.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </optgroup>
                      ))
                    : (
                      <optgroup key={group.label} label={group.label}>
                        {group.types.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </optgroup>
                    )
                )}
              </select>
              {typeDescription && <p className="mt-1 text-[11px] text-zinc-500">{typeDescription}</p>}
              <p className="mt-1 text-[11px] text-zinc-600">Goes to the {queueRole} queue.</p>
              {errors.type && <p className="mt-1 text-[11px] text-rose-300">{errors.type}</p>}
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500" htmlFor="staff-ticket-priority">
                Priority
              </label>
              <select
                id="staff-ticket-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as 'Low' | 'Medium' | 'High')}
                className={`mt-1.5 ${fieldClass(accent)}`}
              >
                {TICKET_PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-zinc-500" htmlFor="staff-ticket-description">
              Description
            </label>
            <textarea
              id="staff-ticket-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              maxLength={5000}
              placeholder="What happened, and what the member needs"
              className={`mt-1.5 resize-y ${fieldClass(accent)}`}
            />
            {errors.description && <p className="mt-1 text-[11px] text-rose-300">{errors.description}</p>}
          </div>

          <label className={`flex items-start gap-2 text-sm ${canAssignToMe ? 'text-zinc-200' : 'text-zinc-500'}`}>
            <input
              type="checkbox"
              checked={canAssignToMe && assignToMe}
              disabled={!canAssignToMe}
              onChange={(event) => setAssignToMe(event.target.checked)}
              className="mt-1"
            />
            <span>
              Assign to me
              {!canAssignToMe && (
                <span className="block text-[11px] text-zinc-500">
                  This type belongs to another queue, so it stays unassigned for that desk.
                </span>
              )}
            </span>
          </label>

          {formError && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{formError}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/[0.08] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${ACCENT_BTN[accent]}`}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {submitting ? 'Creating…' : 'Create ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
