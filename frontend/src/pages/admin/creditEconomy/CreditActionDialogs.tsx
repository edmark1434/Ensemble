import { useState, type ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import { showSuccessToast } from '@/components/utility/toast.ts';
import {
  adjustAccountCredits,
  freezeAccountCredits,
  handleAccountActionError,
} from '../userTeam/accountActions';
import { formatCredits, INPUT } from './economyUi';
import { CreditHoldFields, useCreditHoldForm } from './CreditHoldFields';
import type { EconomyWallet } from './creditEconomyTypes';

const MAX_ADJUSTMENT = 1_000_000;
const LARGE_ADJUSTMENT = 10_000;

function DialogShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:pl-[260px]" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12131a] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-xs text-zinc-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-white/[0.08] px-5 py-3">{footer}</div>
      </div>
    </div>
  );
}

function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <span className="mt-1 block text-[11px] text-amber-300">{children}</span>;
}

function BalanceLine({ label, value, tone = 'text-white' }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-semibold tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

const CANCEL_BTN = 'rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-zinc-300 hover:text-white';

/** Grant or deduct spendable credits. A reason is required and is shown to the member. */
export function AdjustCreditsDialog({
  wallet,
  onClose,
  onDone,
}: {
  wallet: EconomyWallet;
  onClose: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<'grant' | 'deduct'>('grant');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [confirmLarge, setConfirmLarge] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const value = Number(amount);
  const amountError =
    amount === ''
      ? 'Enter an amount'
      : !Number.isInteger(value) || value <= 0
        ? 'Whole credits greater than zero'
        : value > MAX_ADJUSTMENT
          ? 'At most 1,000,000 at a time'
          : mode === 'deduct' && value > wallet.spendableCredits
            ? `Only ${formatCredits(wallet.spendableCredits)} spendable credits${wallet.heldCredits ? ' (held credits cannot be deducted)' : ''}`
            : '';
  const reasonError = reason.trim().length < 5 ? 'At least 5 characters' : '';
  const isLarge = !amountError && value >= LARGE_ADJUSTMENT;
  const delta = amountError ? 0 : mode === 'grant' ? value : -value;
  const canSubmit = !amountError && !reasonError && (!isLarge || confirmLarge) && !saving;

  const submit = async () => {
    setTouched(true);
    if (!canSubmit) return;
    setSaving(true);
    try {
      await adjustAccountCredits(wallet.accountId, delta, reason.trim());
      onDone();
    } catch (err) {
      handleAccountActionError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogShell
      title="Adjust credits"
      subtitle={`${wallet.name} · @${wallet.username || '—'}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={CANCEL_BTN}>
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || (touched && !canSubmit)}
            onClick={() => void submit()}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-50 ${
              mode === 'grant'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border-red-500/40 bg-red-500/10 text-red-200'
            }`}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'grant' ? 'Grant credits' : 'Deduct credits'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
        {(['grant', 'deduct'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`rounded-lg py-1.5 text-xs font-medium transition ${
              mode === id
                ? id === 'grant'
                  ? 'bg-emerald-500/15 text-emerald-200'
                  : 'bg-red-500/15 text-red-200'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {id === 'grant' ? 'Grant (+)' : 'Deduct (−)'}
          </button>
        ))}
      </div>

      <label className="block text-xs font-medium text-zinc-300">
        Amount
        <input
          type="number"
          min={1}
          max={MAX_ADJUSTMENT}
          step={1}
          inputMode="numeric"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setConfirmLarge(false);
          }}
          className={`mt-1 ${INPUT} focus:ring-white/10`}
          placeholder="e.g. 250"
        />
        <FieldError>{touched || amount ? amountError : ''}</FieldError>
      </label>

      <label className="block text-xs font-medium text-zinc-300">
        Reason the member will see
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          className={`mt-1 ${INPUT} focus:ring-white/10`}
          placeholder={mode === 'grant' ? 'e.g. Refund for a failed purchase (ticket TKT-1234)' : 'e.g. Reversing a duplicate grant from 12 Nov'}
        />
        <FieldError>{touched || reason ? reasonError : ''}</FieldError>
        <span className="mt-1 block text-[10px] text-zinc-600">
          Saved in the audit log with your name. Reference a ticket when there is one.
        </span>
      </label>

      <div className="space-y-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <BalanceLine label="Spendable now" value={formatCredits(wallet.spendableCredits)} />
        {wallet.heldCredits > 0 && (
          <BalanceLine label="On hold (unchanged)" value={formatCredits(wallet.heldCredits)} tone="text-amber-300" />
        )}
        <BalanceLine
          label="Spendable after"
          value={formatCredits(wallet.spendableCredits + delta)}
          tone={delta > 0 ? 'text-emerald-300' : delta < 0 ? 'text-red-300' : 'text-white'}
        />
      </div>

      {isLarge && (
        <label className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs text-amber-100">
          <input
            type="checkbox"
            checked={confirmLarge}
            onChange={(e) => setConfirmLarge(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-amber-500"
          />
          This is a large adjustment ({formatCredits(value)} credits). I have checked the amount and the account.
        </label>
      )}
    </DialogShell>
  );
}

/** Hold all or part of the spendable balance, with a reason and an optional release time. */
export function HoldCreditsDialog({
  wallets,
  onClose,
  onDone,
}: {
  wallets: EconomyWallet[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const single = wallets.length === 1 ? wallets[0] : null;
  const form = useCreditHoldForm(single ? single.spendableCredits : null);
  const { reason, setReason, reasonError } = form;
  const holdable = wallets.reduce(
    (s, w) =>
      s +
      (form.amountMode === 'amount' && form.amountValue && !form.amountError
        ? w.spendableCredits >= form.amountValue
          ? form.amountValue
          : 0
        : w.spendableCredits),
    0
  );

  const submit = async () => {
    setTouched(true);
    if (form.hasError) return;
    setSaving(true);
    let ok = 0;
    let failed = 0;
    let lastError: unknown = null;
    const hold = form.input();
    for (const wallet of wallets) {
      try {
        await freezeAccountCredits(wallet.accountId, true, { silent: wallets.length > 1 }, hold);
        ok += 1;
      } catch (err) {
        failed += 1;
        lastError = err;
      }
    }
    setSaving(false);
    if (failed && lastError) handleAccountActionError(lastError);
    if (ok > 0) {
      if (wallets.length > 1) {
        showSuccessToast(`Held credits on ${ok} wallet${ok === 1 ? '' : 's'}${failed ? ` (${failed} failed)` : ''}`);
      }
      onDone();
    }
  };

  return (
    <DialogShell
      title={single?.hold ? 'Hold more credits' : 'Freeze credits'}
      subtitle={single ? `${single.name} · @${single.username || '—'}` : `${wallets.length} wallets selected`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={CANCEL_BTN}>
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || (touched && form.hasError)}
            onClick={() => void submit()}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm hold
          </button>
        </>
      }
    >
      <p className="text-xs text-zinc-400">
        Moves all or part of the spendable balance into a hold the member cannot spend. Credits are not taken away.
        The member is notified with this reason and the release time, and can appeal. Credits that arrive later are not
        held unless you hold again.
      </p>
      <div className="space-y-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <BalanceLine label="Will be held now" value={formatCredits(holdable)} tone="text-amber-300" />
        {single && (
          <BalanceLine label="Spendable after" value={formatCredits(single.spendableCredits - holdable)} />
        )}
        {single?.hold && (
          <BalanceLine label="Already on hold" value={formatCredits(single.heldCredits)} tone="text-amber-300" />
        )}
      </div>
      {holdable === 0 && (
        <p className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-zinc-400">
          {single ? 'This wallet has' : 'These wallets have'} no spendable credits to hold right now.
        </p>
      )}
      <label className="block text-xs font-medium text-zinc-300">
        Reason the member will see
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          className={`mt-1 ${INPUT} focus:ring-amber-500/20`}
          placeholder="e.g. Chargeback under review on a recent top-up"
        />
        <FieldError>{touched || reason ? reasonError : ''}</FieldError>
      </label>
      <CreditHoldFields form={form} touched={touched} />
    </DialogShell>
  );
}

/** Return held credits to the spendable balance. */
export function ReleaseHoldDialog({
  wallets,
  onClose,
  onDone,
}: {
  wallets: EconomyWallet[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const held = wallets.filter((w) => w.heldCredits > 0);
  const single = held.length === 1 ? held[0] : null;
  const credits = held.reduce((s, w) => s + w.heldCredits, 0);

  const submit = async () => {
    setSaving(true);
    let ok = 0;
    let failed = 0;
    let lastError: unknown = null;
    for (const wallet of held) {
      try {
        await freezeAccountCredits(wallet.accountId, false, { silent: held.length > 1 }, { reason: note.trim() || undefined });
        ok += 1;
      } catch (err) {
        failed += 1;
        lastError = err;
      }
    }
    setSaving(false);
    if (failed && lastError) handleAccountActionError(lastError);
    if (ok > 0) {
      if (held.length > 1) {
        showSuccessToast(`Released ${ok} hold${ok === 1 ? '' : 's'}${failed ? ` (${failed} failed)` : ''}`);
      }
      onDone();
    }
  };

  return (
    <DialogShell
      title="Release hold"
      subtitle={single ? `${single.name} · @${single.username || '—'}` : `${held.length} wallets on hold`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={CANCEL_BTN}>
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || held.length === 0}
            onClick={() => void submit()}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Release {formatCredits(credits)} credits
          </button>
        </>
      }
    >
      {held.length === 0 ? (
        <p className="text-sm text-zinc-400">None of the selected wallets have credits on hold.</p>
      ) : (
        <>
          <p className="text-xs text-zinc-400">
            Returns the held credits to the spendable balance and tells the member the hold has ended.
          </p>
          {single?.hold?.reason && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3 text-xs text-amber-100">
              <p className="text-[10px] uppercase tracking-wide text-amber-300/70">Hold reason</p>
              <p className="mt-1">{single.hold.reason}</p>
            </div>
          )}
          <label className="block text-xs font-medium text-zinc-300">
            Note for the audit log (optional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              placeholder="e.g. Chargeback resolved in the member's favour"
              className={`mt-1 ${INPUT} focus:ring-emerald-500/20`}
            />
          </label>
        </>
      )}
    </DialogShell>
  );
}
