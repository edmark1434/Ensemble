import { useState } from 'react';
import type { CreditHoldInput } from '../userTeam/accountActions';
import { formatCredits, formatDateTime, INPUT } from './economyUi';

export const MAX_HOLD_DAYS = 365;
const DAY_MS = 86_400_000;

type AmountMode = 'all' | 'amount';
type ReleaseMode = 'review' | 'days' | 'date';

/** `YYYY-MM-DDTHH:mm` in the viewer's time zone, the format a datetime-local input uses. */
function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

/**
 * Amount and release time for a staff credit hold.
 * @param spendable spendable credits of the one wallet being held; null for several wallets
 *   (the amount then applies to each one).
 */
export function useCreditHoldForm(spendable: number | null) {
  const [reason, setReason] = useState('');
  const [amountMode, setAmountMode] = useState<AmountMode>('all');
  const [amount, setAmount] = useState('');
  const [releaseMode, setReleaseMode] = useState<ReleaseMode>('review');
  const [days, setDays] = useState('');
  const [releaseAt, setReleaseAt] = useState('');

  const reasonError = reason.trim().length < 5 ? 'At least 5 characters' : '';

  const amountValue = amountMode === 'amount' && amount !== '' ? Number(amount) : null;
  const amountError =
    amountMode !== 'amount'
      ? ''
      : amount === ''
        ? 'Enter how many credits to hold'
        : !Number.isInteger(amountValue) || (amountValue ?? 0) < 1
          ? 'Whole credits, at least 1'
          : spendable !== null && (amountValue ?? 0) > spendable
            ? `Only ${formatCredits(spendable)} spendable credits`
            : '';

  const dayValue = releaseMode === 'days' && days !== '' ? Number(days) : null;
  const releaseDate = releaseMode === 'date' && releaseAt ? new Date(releaseAt) : null;
  const releaseError =
    releaseMode === 'days'
      ? days === ''
        ? 'Enter the number of days'
        : !Number.isInteger(dayValue) || (dayValue ?? 0) < 1 || (dayValue ?? 0) > MAX_HOLD_DAYS
          ? `Whole days from 1 to ${MAX_HOLD_DAYS}`
          : ''
      : releaseMode === 'date'
        ? !releaseDate || Number.isNaN(releaseDate.getTime())
          ? 'Pick the release date and time'
          : releaseDate.getTime() <= Date.now()
            ? 'Pick a time in the future'
            : releaseDate.getTime() > Date.now() + MAX_HOLD_DAYS * DAY_MS
              ? `At most ${MAX_HOLD_DAYS} days from now`
              : ''
        : '';

  const releaseOn = releaseError
    ? null
    : releaseMode === 'days' && dayValue
      ? new Date(Date.now() + dayValue * DAY_MS).toISOString()
      : releaseMode === 'date' && releaseDate
        ? releaseDate.toISOString()
        : null;

  const hasError = Boolean(reasonError || amountError || releaseError);

  const input = (): CreditHoldInput => ({
    reason: reason.trim(),
    amount: amountMode === 'amount' ? amountValue : null,
    days: releaseMode === 'days' ? dayValue : null,
    endsAt: releaseMode === 'date' && releaseDate ? releaseDate.toISOString() : null,
  });

  const reset = () => {
    setReason('');
    setAmountMode('all');
    setAmount('');
    setReleaseMode('review');
    setDays('');
    setReleaseAt('');
  };

  return {
    spendable,
    reason,
    setReason,
    amountMode,
    setAmountMode,
    amount,
    setAmount,
    amountValue,
    releaseMode,
    setReleaseMode,
    days,
    setDays,
    releaseAt,
    setReleaseAt,
    reasonError,
    amountError,
    releaseError,
    releaseOn,
    hasError,
    input,
    reset,
  };
}

export type CreditHoldForm = ReturnType<typeof useCreditHoldForm>;

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${
            value === option.id ? 'bg-amber-500/15 text-amber-200' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <span className="mt-1 block text-[11px] text-amber-300">{children}</span>;
}

/** How much to hold and when it is released. Pair with `useCreditHoldForm`. */
export function CreditHoldFields({ form, touched = false }: { form: CreditHoldForm; touched?: boolean }) {
  const minRelease = toLocalInput(new Date(Date.now() + 60_000));
  const maxRelease = toLocalInput(new Date(Date.now() + MAX_HOLD_DAYS * DAY_MS));
  const bulk = form.spendable === null;

  return (
    <>
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-zinc-300">Credits to hold</p>
        <Segmented
          label="Credits to hold"
          value={form.amountMode}
          onChange={form.setAmountMode}
          options={[
            { id: 'all', label: bulk ? 'All spendable' : `All spendable (${formatCredits(form.spendable)})` },
            { id: 'amount', label: 'Specific amount' },
          ]}
        />
        {form.amountMode === 'amount' && (
          <label className="block">
            <span className="sr-only">Amount to hold</span>
            <input
              type="number"
              min={1}
              max={form.spendable ?? undefined}
              step={1}
              inputMode="numeric"
              value={form.amount}
              onChange={(e) => form.setAmount(e.target.value)}
              placeholder={bulk ? 'Credits to hold on each wallet' : 'e.g. 500'}
              className={`${INPUT} focus:ring-amber-500/20`}
            />
            <FieldError>{touched || form.amount ? form.amountError : ''}</FieldError>
            <span className="mt-1 block text-[10px] text-zinc-600">
              {bulk
                ? 'Held on each selected wallet. A wallet with fewer spendable credits is not held.'
                : 'The rest stays spendable.'}
            </span>
          </label>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-zinc-300">Release</p>
        <Segmented
          label="Release"
          value={form.releaseMode}
          onChange={form.setReleaseMode}
          options={[
            { id: 'review', label: 'Until reviewed' },
            { id: 'days', label: 'After days' },
            { id: 'date', label: 'Date & time' },
          ]}
        />
        {form.releaseMode === 'days' && (
          <label className="block">
            <span className="sr-only">Release after days</span>
            <input
              type="number"
              min={1}
              max={MAX_HOLD_DAYS}
              step={1}
              inputMode="numeric"
              value={form.days}
              onChange={(e) => form.setDays(e.target.value)}
              placeholder={`Days, 1 to ${MAX_HOLD_DAYS}`}
              className={`${INPUT} focus:ring-amber-500/20`}
            />
          </label>
        )}
        {form.releaseMode === 'date' && (
          <label className="block">
            <span className="sr-only">Release date and time</span>
            <input
              type="datetime-local"
              min={minRelease}
              max={maxRelease}
              value={form.releaseAt}
              onChange={(e) => form.setReleaseAt(e.target.value)}
              className={`${INPUT} [color-scheme:dark] focus:ring-amber-500/20`}
            />
          </label>
        )}
        <FieldError>{touched || form.days || form.releaseAt ? form.releaseError : ''}</FieldError>
        <span className="block text-[10px] text-zinc-600">
          {form.releaseOn
            ? `Released automatically on ${formatDateTime(form.releaseOn)} (your time).`
            : form.releaseMode === 'review'
              ? 'Stays until someone releases it.'
              : ''}
        </span>
      </div>
    </>
  );
}
