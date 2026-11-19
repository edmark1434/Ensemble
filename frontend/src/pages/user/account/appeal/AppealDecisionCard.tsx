import { Ban, CheckCircle2, Gavel, ShieldAlert, XCircle } from 'lucide-react';
import type { AppealDecisionCardData } from './appealShared';

/**
 * An appeal decision, rendered as a verdict panel rather than a chat line — the same treatment
 * as a dispute ruling (`DisputeDecisionCard`): the penalty and the outcome are the headline, the
 * platform is the author, and the boilerplate sits quietly at the foot.
 */
const TONES = {
  accepted: {
    shell: 'border-emerald-300 bg-emerald-50/80 dark:border-emerald-400/40 dark:bg-emerald-500/[0.07]',
    shellDark: 'border-emerald-400/40 bg-emerald-500/[0.07]',
    bar: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100',
    barDark: 'bg-emerald-500/20 text-emerald-100',
    icon: 'text-emerald-500',
    Icon: CheckCircle2,
  },
  denied: {
    shell: 'border-rose-300 bg-rose-50/80 dark:border-rose-400/40 dark:bg-rose-500/[0.07]',
    shellDark: 'border-rose-400/40 bg-rose-500/[0.07]',
    bar: 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-100',
    barDark: 'bg-rose-500/20 text-rose-100',
    icon: 'text-rose-500',
    Icon: XCircle,
  },
  denied_permanent: {
    shell: 'border-rose-400 bg-rose-50/90 dark:border-rose-400/60 dark:bg-rose-500/[0.1]',
    shellDark: 'border-rose-400/60 bg-rose-500/[0.1]',
    bar: 'bg-rose-200 text-rose-950 dark:bg-rose-500/30 dark:text-rose-50',
    barDark: 'bg-rose-500/30 text-rose-50',
    icon: 'text-rose-500',
    Icon: Ban,
  },
} as const;

export default function AppealDecisionCard({
  card,
  when,
  dark = false,
}: {
  card: AppealDecisionCardData;
  when?: string | null;
  /** Force the dark palette for the staff console, which is dark regardless of theme. */
  dark?: boolean;
}) {
  const tone = TONES[card.decision] || TONES.denied;
  const Icon = tone.Icon;
  const strong = dark ? 'text-white' : 'text-gray-900 dark:text-white';
  const muted = dark ? 'text-zinc-400' : 'text-gray-500 dark:text-zinc-400';
  const bodyText = dark ? 'text-zinc-200' : 'text-gray-700 dark:text-zinc-200';
  const rule = dark ? 'border-white/10' : 'border-gray-200 dark:border-white/10';
  const inset = dark ? 'bg-white/[0.03]' : 'bg-white/70 dark:bg-white/[0.03]';

  return (
    <article className={`overflow-hidden rounded-2xl border-2 shadow-sm ${dark ? tone.shellDark : tone.shell}`}>
      <header className={`flex flex-wrap items-center gap-2 px-4 py-2.5 ${dark ? tone.barDark : tone.bar}`}>
        <Gavel className="h-4 w-4 shrink-0" />
        <span className="text-xs font-black uppercase tracking-[0.14em]">{card.headline}</span>
        {card.ticketNumber ? (
          <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold tracking-wide dark:bg-white/10">
            #{card.ticketNumber}
          </span>
        ) : null}
        {when ? <span className="ml-auto text-[11px] font-semibold opacity-80">{when}</span> : null}
      </header>

      <div className="space-y-3 px-5 py-4">
        <div className="flex items-start gap-3">
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.icon}`} />
          <div className="min-w-0">
            <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>
              {card.target ? 'Penalty appealed' : 'Appeal'}
            </p>
            <p className={`mt-0.5 text-sm font-semibold ${strong}`}>{card.target?.label || 'Account penalty'}</p>
          </div>
        </div>

        <div>
          <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>{card.outcomeLabel}</p>
          <p className={`mt-0.5 text-lg font-extrabold leading-snug sm:text-xl ${strong}`}>{card.outcome}</p>
        </div>

        {card.paragraphs.map((paragraph, index) => (
          <p key={index} className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${bodyText}`}>
            {paragraph}
          </p>
        ))}

        {card.note ? (
          <div className={`rounded-xl border px-3 py-2 ${rule} ${inset}`}>
            <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>Reviewing staff noted</p>
            <p className={`mt-0.5 whitespace-pre-wrap break-words text-sm ${bodyText}`}>{card.note}</p>
          </div>
        ) : null}

        {card.followUp ? (
          <div
            className={`rounded-xl border px-3 py-2 ${
              dark ? 'border-rose-400/30 bg-rose-500/10' : 'border-rose-300 bg-rose-50 dark:border-rose-400/30 dark:bg-rose-500/10'
            }`}
          >
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700 dark:text-rose-300">
              <ShieldAlert className="h-3.5 w-3.5" /> Further action · {card.followUp.title}
            </p>
            {card.followUp.detail ? <p className={`mt-0.5 text-sm font-semibold ${strong}`}>{card.followUp.detail}</p> : null}
            {card.followUp.reason ? (
              <p className={`mt-0.5 whitespace-pre-wrap break-words text-sm ${bodyText}`}>Reason: {card.followUp.reason}</p>
            ) : null}
          </div>
        ) : null}

        {card.reappeal ? <p className={`text-sm font-medium ${bodyText}`}>{card.reappeal}</p> : null}

        <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-2.5 ${rule}`}>
          <ShieldCheckIcon className={tone.icon} />
          <span className={`text-[11px] font-bold ${strong}`}>Ensemble Appeals</span>
          <span className={`text-[11px] ${muted}`}>· Platform decision</span>
        </div>

        {card.closing ? <p className={`whitespace-pre-wrap text-[11px] leading-relaxed ${muted}`}>{card.closing}</p> : null}
      </div>
    </article>
  );
}

function ShieldCheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-3.5 w-3.5 shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
