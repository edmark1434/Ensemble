import { useEffect, useMemo, useState } from 'react';

export type SanctionTiming = {
  duration: 'temporary' | 'permanent';
  endsAt: string | null;
  summary: string;
};

type Unit = 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
type TimedMode = 'length' | 'until';

const UNITS: { id: Unit; label: string }[] = [
  { id: 'seconds', label: 'Seconds' },
  { id: 'minutes', label: 'Minutes' },
  { id: 'hours', label: 'Hours' },
  { id: 'days', label: 'Days' },
  { id: 'weeks', label: 'Weeks' },
  { id: 'months', label: 'Months' },
  { id: 'years', label: 'Years' },
];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function dateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timeInputValue(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function addLength(amount: number, unit: Unit, from = new Date()) {
  const next = new Date(from);
  if (unit === 'seconds') next.setSeconds(next.getSeconds() + amount);
  if (unit === 'minutes') next.setMinutes(next.getMinutes() + amount);
  if (unit === 'hours') next.setHours(next.getHours() + amount);
  if (unit === 'days') next.setDate(next.getDate() + amount);
  if (unit === 'weeks') next.setDate(next.getDate() + amount * 7);
  if (unit === 'months') next.setMonth(next.getMonth() + amount);
  if (unit === 'years') next.setFullYear(next.getFullYear() + amount);
  return next;
}

function formatWhen(date: Date) {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function SanctionScheduleFields({
  defaultDuration = 'temporary',
  onChange,
}: {
  defaultDuration?: 'temporary' | 'permanent';
  onChange: (timing: SanctionTiming) => void;
}) {
  const [duration, setDuration] = useState<'temporary' | 'permanent'>(defaultDuration);
  const [timedMode, setTimedMode] = useState<TimedMode>('length');
  const [amount, setAmount] = useState('7');
  const [unit, setUnit] = useState<Unit>('days');
  const tomorrow = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  }, []);
  const [untilDate, setUntilDate] = useState(dateInputValue(tomorrow));
  const [untilTime, setUntilTime] = useState(timeInputValue(new Date()));

  const timing = useMemo<SanctionTiming>(() => {
    if (duration === 'permanent') {
      return { duration: 'permanent', endsAt: null, summary: 'Stays until a staff member removes it.' };
    }
    if (timedMode === 'length') {
      const count = Number(amount);
      if (!Number.isFinite(count) || count <= 0) {
        return { duration: 'temporary', endsAt: null, summary: 'Enter how long it lasts.' };
      }
      const ends = addLength(count, unit);
      if (ends.getTime() <= Date.now()) {
        return { duration: 'temporary', endsAt: null, summary: 'That length has to be in the future.' };
      }
      const unitLabel = UNITS.find((item) => item.id === unit)?.label.toLowerCase() || unit;
      return {
        duration: 'temporary',
        endsAt: ends.toISOString(),
        summary: `Ends ${formatWhen(ends)} · ${count} ${unitLabel}`,
      };
    }
    const ends = new Date(`${untilDate}T${untilTime}`);
    if (!untilDate || !untilTime || Number.isNaN(ends.getTime())) {
      return { duration: 'temporary', endsAt: null, summary: 'Choose a date and a time.' };
    }
    if (ends.getTime() <= Date.now()) {
      return { duration: 'temporary', endsAt: null, summary: 'That date and time are already past.' };
    }
    return {
      duration: 'temporary',
      endsAt: ends.toISOString(),
      summary: `Ends ${formatWhen(ends)}`,
    };
  }, [amount, duration, timedMode, unit, untilDate, untilTime]);

  useEffect(() => {
    onChange(timing);
  }, [onChange, timing]);

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {(['temporary', 'permanent'] as const).map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => setDuration(choice)}
            className={`rounded-xl border px-3 py-2 text-sm capitalize ${
              duration === choice ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 text-zinc-400'
            }`}
          >
            {choice}
          </button>
        ))}
      </div>
      {duration === 'temporary' ? (
        <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTimedMode('length')}
              className={`rounded-lg border px-3 py-1.5 text-xs ${timedMode === 'length' ? 'border-white/30 text-white' : 'border-white/10 text-zinc-400'}`}
            >
              Length of time
            </button>
            <button
              type="button"
              onClick={() => setTimedMode('until')}
              className={`rounded-lg border px-3 py-1.5 text-xs ${timedMode === 'until' ? 'border-white/30 text-white' : 'border-white/10 text-zinc-400'}`}
            >
              Date and time
            </button>
          </div>
          {timedMode === 'length' ? (
            <div className="grid grid-cols-[1fr_1.2fr] gap-2">
              <label className="text-xs text-zinc-400">
                Amount
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="text-xs text-zinc-400">
                Unit
                <select
                  value={unit}
                  onChange={(event) => setUnit(event.target.value as Unit)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white"
                >
                  {UNITS.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-zinc-400">
                Date
                <input
                  type="date"
                  value={untilDate}
                  onChange={(event) => setUntilDate(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="text-xs text-zinc-400">
                Time
                <input
                  type="time"
                  step={1}
                  value={untilTime}
                  onChange={(event) => setUntilTime(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-white"
                />
              </label>
            </div>
          )}
          <p className="text-xs text-zinc-300">{timing.summary}</p>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">{timing.summary}</p>
      )}
    </div>
  );
}
