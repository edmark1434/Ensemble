import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Gavel, X } from 'lucide-react';
import api from '@/lib/axios';
import { BTN, FIELD } from '@/pages/moderator/shared/staffCaseUi';
import { AppealStandingBrief } from './TicketCasePanel';
import type { TicketCaseContext } from './ticketTypes';

export type AppealChoice = 'accept' | 'deny' | 'deny_permanent';

/** What `POST /api/staff/tickets/:id/appeal-decision` takes besides the decision. */
export type AppealDecisionPayload = {
  remedy?: 'lift_24h' | 'lift_now' | 'shorten';
  endsAt?: string;
  note?: string;
  followUp?: { action: 'none' | 'suspend' | 'ban'; punishmentId?: string; reason?: string; days?: number | null };
};

type CatalogRow = { slug?: string; id?: string; label: string; kind: string; durationDays: number | null; permanent?: boolean; note?: string };

const TITLE: Record<AppealChoice, string> = {
  accept: 'Accept this appeal',
  deny: 'Deny this appeal',
  deny_permanent: 'Deny this appeal permanently',
};

const NOTE_MAX = 1000;

function localInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function OptionRow({
  checked,
  onSelect,
  title,
  body,
  name,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  body: string;
  name: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 transition ${
        checked ? 'border-sky-500/40 bg-sky-500/10' : 'border-white/10 hover:bg-white/[0.03]'
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="mt-0.5" />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-zinc-100">{title}</span>
        <span className="block text-[11px] text-zinc-400">{body}</span>
      </span>
    </label>
  );
}

/**
 * The decision step for an appeal. Accepting asks how to lift the penalty (within 24 hours,
 * now, or on an earlier date; a warning is rescinded). Denying can also suspend or ban the
 * account in the same step. Either can carry a note the member reads on the decision card.
 * The server re-checks every option.
 */
export default function AppealDecisionDialog({
  choice,
  context,
  targeted,
  busy,
  onCancel,
  onConfirm,
}: {
  choice: AppealChoice;
  context: TicketCaseContext | null | undefined;
  /** The ticket names one penalty (from the ticket itself, so it holds even if the case file failed). */
  targeted: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (payload: AppealDecisionPayload) => void;
}) {
  const target = context?.appeal?.target || null;
  const legacy = !targeted;
  // Targeted, but the case file did not load: only the standard lift is offered.
  const targetUnknown = targeted && !target;
  const remedies = target?.remedies || [];
  const canLift = remedies.includes('lift_now');
  const isWarning = target?.type === 'warning';
  const currentEnd = target?.current?.endsAt ? new Date(target.current.endsAt) : null;

  const [remedy, setRemedy] = useState<'lift_24h' | 'lift_now' | 'shorten'>('lift_24h');
  const [endsAt, setEndsAt] = useState(() => localInputValue(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)));
  const [note, setNote] = useState('');
  const [action, setAction] = useState<'none' | 'suspend' | 'ban'>('none');
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [punishmentId, setPunishmentId] = useState('');
  const [reason, setReason] = useState('');
  const [customDays, setCustomDays] = useState('');
  const [permanentBan, setPermanentBan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  // The named suspensions and bans Support may issue (same catalog as the restriction desks).
  useEffect(() => {
    if (action === 'none') return;
    let cancelled = false;
    setCatalogError(null);
    api
      .get('/api/moderator/punishment-catalog', { params: { desk: 'support', kind: action } })
      .then((res) => {
        if (cancelled) return;
        const rows = (Array.isArray(res.data?.data) ? res.data.data : []) as CatalogRow[];
        setCatalog(rows);
        setPunishmentId((current) => (rows.some((row) => (row.slug || row.id) === current) ? current : rows[0]?.slug || rows[0]?.id || ''));
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog([]);
          setCatalogError('Could not load the punishment list.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [action]);

  const picked = useMemo(() => catalog.find((row) => (row.slug || row.id) === punishmentId) || null, [catalog, punishmentId]);

  function submit() {
    setError(null);
    const payload: AppealDecisionPayload = {};
    if (note.trim()) payload.note = note.trim();
    if (choice === 'accept') {
      if (!legacy && canLift) {
        payload.remedy = remedy;
        if (remedy === 'shorten') {
          const at = new Date(endsAt);
          if (Number.isNaN(at.getTime()) || at.getTime() <= Date.now() + 60 * 1000) {
            setError('Pick a new end time at least a minute from now.');
            return;
          }
          if (currentEnd && at.getTime() >= currentEnd.getTime()) {
            setError('Pick an end time before the current one.');
            return;
          }
          payload.endsAt = at.toISOString();
        }
      }
    } else if (action !== 'none') {
      if (!punishmentId) {
        setError(`Pick which ${action === 'ban' ? 'ban' : 'suspension'} to issue.`);
        return;
      }
      const why = reason.trim() || note.trim();
      if (why.length < 5) {
        setError('Write the reason the member sees for this action.');
        return;
      }
      const followUp: AppealDecisionPayload['followUp'] = { action, punishmentId, reason: why };
      if (action === 'ban' && permanentBan) followUp.days = null;
      else if (customDays.trim()) {
        const days = Number(customDays);
        if (!Number.isInteger(days) || days < 1 || days > 365) {
          setError('Choose between 1 and 365 days, or leave it empty for the catalog length.');
          return;
        }
        followUp.days = days;
      }
      payload.followUp = followUp;
    }
    onConfirm(payload);
  }

  const confirmClass = choice === 'accept' ? BTN.success : choice === 'deny' ? BTN.warn : BTN.danger;
  const defaultLength = picked ? (picked.durationDays == null ? 'permanent' : `${picked.durationDays} day${picked.durationDays === 1 ? '' : 's'}`) : '';

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4" onClick={() => (busy ? undefined : onCancel())}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="appeal-decision-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#14151c] text-zinc-200 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-zinc-400" />
            <h2 id="appeal-decision-title" className="text-base font-semibold text-white">
              {TITLE[choice]}
            </h2>
          </div>
          <button type="button" onClick={onCancel} disabled={busy} aria-label="Close" className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <AppealStandingBrief context={context} />

          {choice === 'accept' ? (
            <section className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">How to lift it</p>
              {legacy ? (
                <p className="text-xs text-zinc-400">
                  This appeal covers the whole account (filed before appeals were per penalty): its ban, lock, suspension, timeouts,
                  automatic punishments and credit holds end within 24 hours.
                </p>
              ) : targetUnknown ? (
                <p className="text-xs text-amber-200">
                  The case file did not load, so only the standard outcome is offered: the penalty under appeal ends within 24 hours
                  (a warning is rescinded). Reload the ticket for more options.
                </p>
              ) : isWarning ? (
                <p className="text-xs text-zinc-300">The warning is rescinded at once; its points stop counting and any automatic punishment it started ends.</p>
              ) : !canLift ? (
                <p className="text-xs text-amber-200">This penalty is no longer active, so accepting only records the decision.</p>
              ) : (
                <div className="space-y-1.5">
                  <OptionRow
                    name="appeal-remedy"
                    checked={remedy === 'lift_24h'}
                    onSelect={() => setRemedy('lift_24h')}
                    title="Lift within 24 hours"
                    body="The standard outcome. It ends 24 hours from now, or sooner if it was already going to."
                  />
                  <OptionRow
                    name="appeal-remedy"
                    checked={remedy === 'lift_now'}
                    onSelect={() => setRemedy('lift_now')}
                    title="Lift now"
                    body="Ends immediately, for a clear mistake."
                  />
                  <OptionRow
                    name="appeal-remedy"
                    checked={remedy === 'shorten'}
                    onSelect={() => setRemedy('shorten')}
                    title="Shorten it"
                    body="Keep part of it: pick an earlier end date."
                  />
                  {remedy === 'shorten' ? (
                    <div className="pl-7">
                      <input
                        type="datetime-local"
                        value={endsAt}
                        onChange={(event) => setEndsAt(event.target.value)}
                        min={localInputValue(new Date(Date.now() + 5 * 60 * 1000))}
                        max={currentEnd ? localInputValue(currentEnd) : undefined}
                        className={FIELD}
                      />
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {currentEnd ? `Currently ends ${currentEnd.toLocaleString()}.` : 'It has no end date now.'}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          ) : (
            <section className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {choice === 'deny_permanent' ? 'This penalty can never be appealed again' : 'This penalty can be appealed again in 12 months'}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Further action (optional)</p>
              <div className="space-y-1.5">
                <OptionRow name="appeal-follow-up" checked={action === 'none'} onSelect={() => setAction('none')} title="No further action" body="The penalty stays as it is." />
                <OptionRow
                  name="appeal-follow-up"
                  checked={action === 'suspend'}
                  onSelect={() => setAction('suspend')}
                  title="Also suspend the account"
                  body="For example, an appeal that was abusive or dishonest."
                />
                <OptionRow
                  name="appeal-follow-up"
                  checked={action === 'ban'}
                  onSelect={() => setAction('ban')}
                  title="Also ban the account"
                  body="Runs the normal ban clean-up (open jobs, gigs and listings close)."
                />
              </div>
              {action !== 'none' ? (
                <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <label className="block text-[11px] text-zinc-400">
                    {action === 'ban' ? 'Ban' : 'Suspension'}
                    <select value={punishmentId} onChange={(event) => setPunishmentId(event.target.value)} className={`${FIELD} mt-1`}>
                      {catalog.map((row) => (
                        <option key={row.slug || row.id} value={row.slug || row.id}>
                          {row.label} · {row.durationDays == null ? 'permanent' : `${row.durationDays}d`}
                        </option>
                      ))}
                    </select>
                  </label>
                  {catalogError ? <p className="text-[11px] text-red-300">{catalogError}</p> : null}
                  {picked?.note ? <p className="text-[11px] text-zinc-500">{picked.note}</p> : null}
                  {action === 'ban' ? (
                    <label className="flex items-center gap-2 text-xs text-zinc-300">
                      <input type="checkbox" checked={permanentBan} onChange={(event) => setPermanentBan(event.target.checked)} />
                      Permanent ban
                    </label>
                  ) : null}
                  {!(action === 'ban' && permanentBan) ? (
                    <label className="block text-[11px] text-zinc-400">
                      Length in days <span className="text-zinc-600">(empty: {defaultLength || 'catalog length'})</span>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={customDays}
                        onChange={(event) => setCustomDays(event.target.value)}
                        className={`${FIELD} mt-1`}
                      />
                    </label>
                  ) : null}
                  <label className="block text-[11px] text-zinc-400">
                    Reason the member sees
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      maxLength={500}
                      rows={2}
                      placeholder="Leave empty to use the note below."
                      className={`${FIELD} mt-1 resize-y`}
                    />
                  </label>
                </div>
              ) : null}
            </section>
          )}

          <label className="block text-[11px] text-zinc-400">
            Note to the member <span className="text-zinc-600">(optional, shown on the decision)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={NOTE_MAX}
              rows={3}
              placeholder="Why you decided this way."
              className={`${FIELD} mt-1 resize-y`}
            />
          </label>

          {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-3">
          <button type="button" onClick={onCancel} disabled={busy} className={BTN.neutral}>
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={busy} className={confirmClass}>
            {busy ? 'Saving…' : 'Confirm decision'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
