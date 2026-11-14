import { CalendarClock, CheckCircle2, Clock3, PauseCircle, TriangleAlert, Undo2, Zap } from "lucide-react";
import type { DisputePayout, DisputePayoutPolicy, DisputePayoutState } from "./moderatorTypes";
import { BTN, FIELD } from "./staffCaseUi";

const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_PAYOUT_POLICY: DisputePayoutPolicy = { defaultDays: 7, maxDays: 90 };

/** When a money ruling pays out: the default wait, at once, or a date staff pick. */
export type PayoutTiming = {
  mode: "default" | "now" | "date";
  /** `datetime-local` value (local time), used when mode is "date". */
  date: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** A Date as a `datetime-local` input value in the viewer's time zone. */
export function toLocalInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function initialPayoutTiming(policy: DisputePayoutPolicy = DEFAULT_PAYOUT_POLICY): PayoutTiming {
  return { mode: "default", date: toLocalInput(new Date(Date.now() + policy.defaultDays * DAY_MS)) };
}

export function formatPayoutWhen(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** The release date a timing resolves to, or null for "now". */
export function payoutReleaseDate(timing: PayoutTiming, policy: DisputePayoutPolicy = DEFAULT_PAYOUT_POLICY) {
  if (timing.mode === "now") return null;
  if (timing.mode === "default") return new Date(Date.now() + policy.defaultDays * DAY_MS);
  const date = new Date(timing.date);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Client-side mirror of the server's date rules, shown next to the picker. */
export function payoutTimingError(
  timing: PayoutTiming,
  policy: DisputePayoutPolicy = DEFAULT_PAYOUT_POLICY
): string | null {
  if (timing.mode !== "date") return null;
  const date = payoutReleaseDate(timing, policy);
  if (!date) return "Pick a date and time.";
  if (date.getTime() <= Date.now() + 2 * 60 * 1000) return "Pick a time in the future, or choose Pay now.";
  if (date.getTime() > Date.now() + policy.maxDays * DAY_MS) {
    return `Payouts can be scheduled up to ${policy.maxDays} days ahead.`;
  }
  return null;
}

/** Request fields for a timing. The default sends no date, so the server picks it. */
export function payoutTimingBody(timing: PayoutTiming, policy: DisputePayoutPolicy = DEFAULT_PAYOUT_POLICY) {
  if (timing.mode === "now") return { releaseMode: "now" as const };
  if (timing.mode === "default") return { releaseMode: "scheduled" as const };
  const date = payoutReleaseDate(timing, policy);
  return { releaseMode: "scheduled" as const, releaseAt: date ? date.toISOString() : null };
}

export function payoutTimingSummary(timing: PayoutTiming, policy: DisputePayoutPolicy = DEFAULT_PAYOUT_POLICY) {
  if (timing.mode === "now") return "Paid as soon as you confirm.";
  const date = payoutReleaseDate(timing, policy);
  return date ? `Credits stay locked in escrow until ${formatPayoutWhen(date)}.` : "Pick a payout date.";
}

export function PayoutTimingPicker({
  value,
  onChange,
  policy = DEFAULT_PAYOUT_POLICY,
  disabled = false,
  allowNow = true,
  allowDefault = true,
  label = "When the credits are paid",
}: {
  value: PayoutTiming;
  onChange: (next: PayoutTiming) => void;
  policy?: DisputePayoutPolicy;
  disabled?: boolean;
  allowNow?: boolean;
  allowDefault?: boolean;
  label?: string;
}) {
  const now = Date.now();
  const min = toLocalInput(new Date(now + 5 * 60 * 1000));
  const max = toLocalInput(new Date(now + policy.maxDays * DAY_MS));
  const error = payoutTimingError(value, policy);
  const options: { mode: PayoutTiming["mode"]; title: string; hint: string; icon: typeof Clock3 }[] = [];
  if (allowDefault) {
    options.push({
      mode: "default",
      title: `In ${policy.defaultDays} days`,
      hint: `Default. Pays ${formatPayoutWhen(new Date(now + policy.defaultDays * DAY_MS))}, leaving time for an appeal.`,
      icon: Clock3,
    });
  }
  if (allowNow) {
    options.push({
      mode: "now",
      title: "Pay now",
      hint: "Credits reach the Account Wallet the moment you confirm. This can't be undone.",
      icon: Zap,
    });
  }
  options.push({
    mode: "date",
    title: "Choose a date",
    hint: `Any time up to ${policy.maxDays} days from now.`,
    icon: CalendarClock,
  });

  return (
    <fieldset className="space-y-1.5" disabled={disabled}>
      <legend className="mb-1 text-[11px] text-zinc-500">{label}</legend>
      <div className="space-y-1.5" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const active = value.mode === option.mode;
          const Icon = option.icon;
          return (
            <button
              key={option.mode}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ ...value, mode: option.mode })}
              className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition disabled:opacity-50 ${
                active
                  ? option.mode === "now"
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-sky-500/40 bg-sky-500/10"
                  : "border-white/10 hover:border-white/25 hover:bg-white/[0.04]"
              }`}
            >
              <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${active ? "text-white" : "text-zinc-500"}`} />
              <span className="min-w-0">
                <span className={`block text-xs font-semibold ${active ? "text-white" : "text-zinc-200"}`}>
                  {option.title}
                </span>
                <span className="mt-0.5 block text-[11px] text-zinc-400">{option.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      {value.mode === "date" ? (
        <label className="block space-y-1 pt-1 text-[11px] text-zinc-500">
          <span>Payout date and time (your time zone)</span>
          <input
            type="datetime-local"
            value={value.date}
            min={min}
            max={max}
            onChange={(event) => onChange({ ...value, date: event.target.value })}
            aria-invalid={Boolean(error)}
            className={`${FIELD} [color-scheme:dark]`}
          />
          {error ? <span className="block text-[11px] text-red-300">{error}</span> : null}
        </label>
      ) : null}
    </fieldset>
  );
}

function payoutKindLabel(kind: DisputePayout["kind"]) {
  if (kind === "escrow_refund") return "Refund";
  if (kind === "escrow_release") return "Release";
  return "Reversal";
}

function PayoutStatus({ payout, paused }: { payout: DisputePayout; paused: boolean }) {
  if (payout.status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        Paid {formatPayoutWhen(payout.paidAt)}
      </span>
    );
  }
  if (payout.status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">
        <Undo2 className="h-3 w-3" />
        Withdrawn
      </span>
    );
  }
  if (payout.status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-200">
        <TriangleAlert className="h-3 w-3" />
        Failed · retrying hourly
      </span>
    );
  }
  if (paused) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
        <PauseCircle className="h-3 w-3" />
        Paused
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-200">
      <Clock3 className="h-3 w-3" />
      {formatPayoutWhen(payout.releaseAt)}
    </span>
  );
}

/** Every payout of a dispute's money ruling, with the staff actions that apply to it. */
export function DisputePayoutsList({
  payouts,
  state,
  canAct,
  saving,
  onReleaseNow,
  onReschedule,
  onCancel,
}: {
  payouts: DisputePayout[];
  state?: DisputePayoutState;
  canAct: boolean;
  saving: boolean;
  onReleaseNow?: () => void;
  onReschedule?: () => void;
  onCancel?: () => void;
}) {
  const shown = payouts.filter((payout) => payout.status !== "cancelled" || payouts.every((p) => p.status === "cancelled"));
  const waiting = state?.waiting ?? payouts.filter((p) => p.status === "scheduled" || p.status === "failed").length;
  const paused = Boolean(state?.paused);
  const total = shown
    .filter((payout) => payout.status !== "cancelled")
    .reduce((sum, payout) => sum + payout.amount, 0);

  return (
    <div className="space-y-2.5">
      {paused ? (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-100">
          <PauseCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          The case is reopened, so nothing pays out automatically. Pay now, or withdraw the ruling to decide again.
        </p>
      ) : null}
      {state?.failed ? (
        <p className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2 text-[11px] leading-relaxed text-red-100">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {payouts.find((p) => p.status === "failed")?.failureReason ||
            "A payout could not be completed. It retries every hour."}
        </p>
      ) : null}
      <ul className="space-y-1.5">
        {shown.map((payout) => (
          <li key={payout.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-white">
                  {payout.recipientHandle ? `@${payout.recipientHandle}` : payout.recipientName}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {payoutKindLabel(payout.kind)}
                  {payout.recipientRole ? ` · ${payout.recipientRole === "client" ? "Client" : "Freelancer"}` : ""}
                  {" · "}
                  {payout.paysInto}
                </p>
              </div>
              <p
                className={`shrink-0 text-sm tabular-nums ${
                  payout.status === "cancelled" ? "text-zinc-500 line-through" : "text-zinc-100"
                }`}
              >
                {payout.amount.toLocaleString()}
              </p>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <PayoutStatus payout={payout} paused={paused} />
              {payout.status === "scheduled" || payout.status === "failed" ? (
                <span className="text-[10px] text-zinc-500">Held in {payout.heldIn}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {shown.length > 1 ? (
        <p className="flex justify-between text-[11px] text-zinc-500">
          <span>Total</span>
          <span className="tabular-nums text-zinc-300">{total.toLocaleString()} credits</span>
        </p>
      ) : null}
      {canAct && waiting > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" disabled={saving} onClick={onReleaseNow} className={BTN.warn}>
            <Zap className="h-3.5 w-3.5" />
            Pay now
          </button>
          <button type="button" disabled={saving} onClick={onReschedule} className={BTN.neutral}>
            <CalendarClock className="h-3.5 w-3.5" />
            Change date
          </button>
          {state?.canCancel ? (
            <button type="button" disabled={saving} onClick={onCancel} className={BTN.danger}>
              <Undo2 className="h-3.5 w-3.5" />
              Withdraw ruling
            </button>
          ) : null}
        </div>
      ) : null}
      {canAct && waiting > 0 && !state?.canCancel ? (
        <p className="text-[11px] text-zinc-500">Reopen the case to withdraw this ruling before it pays out.</p>
      ) : null}
    </div>
  );
}
