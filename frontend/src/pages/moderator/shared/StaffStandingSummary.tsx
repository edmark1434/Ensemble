import type { ReactNode } from 'react';
import { BadgeCheck, Clock, Coins, MessageSquareOff, ShieldAlert, VolumeX } from 'lucide-react';
import type { CaseAccountSummary } from '@/pages/admin/ticketManagement/ticketTypes';
import { Pill } from './staffCaseUi';

export function caseWhen(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function caseDay(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function caseLabel(value?: string | null) {
  const raw = String(value || '').replace(/[_-]+/g, ' ').trim();
  if (!raw) return '—';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Tone for a free-form status string: closed/ok/warn/bad. */
export function statusTone(status?: string | null) {
  const s = String(status || '').toLowerCase();
  if (/(ban|lock|reject|delist|removed|denied|failed|refunded|suspend|frozen|cancel)/.test(s)) {
    return 'border-red-500/30 bg-red-500/10 text-red-200';
  }
  if (/(pending|review|progress|open|paused|hold|timeout|overdue|dispute|scheduled|waiting)/.test(s)) {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  }
  if (/(active|approved|accepted|completed|complete|paid|released|resolved|verified|ready)/.test(s)) {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  }
  return 'border-white/15 bg-white/5 text-zinc-300';
}

export function StatusPill({ status }: { status?: string | null }) {
  if (!status) return null;
  return <Pill className={statusTone(status)}>{caseLabel(status)}</Pill>;
}

function meritTone(merit: number | null) {
  if (merit == null) return 'text-zinc-300';
  if (merit >= 80) return 'text-emerald-300';
  if (merit >= 50) return 'text-amber-300';
  return 'text-red-300';
}

function Flag({ icon, children, tone }: { icon: ReactNode; children: ReactNode; tone: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${tone}`}>
      {icon}
      {children}
    </span>
  );
}

/** One member's standing at a glance, as staff see it. */
export function StaffStandingSummary({
  account,
  label,
  compact = false,
}: {
  account: CaseAccountSummary | null | undefined;
  label?: string;
  compact?: boolean;
}) {
  if (!account) {
    return <p className="text-xs text-zinc-500">No account record found.</p>;
  }
  const status = String(account.status || 'Active');
  const restricted = /ban|lock|suspend/i.test(status);
  const flags: ReactNode[] = [];
  if (restricted) {
    flags.push(
      <Flag key="status" icon={<ShieldAlert className="h-3 w-3" />} tone="border-red-500/30 bg-red-500/10 text-red-200">
        {status}
        {account.statusEndsAt ? ` until ${caseWhen(account.statusEndsAt)}` : ' · no end date'}
      </Flag>
    );
  }
  // Automatic merit punishments, each on its own fixed clock (merit recovering does not end them).
  const automatic = (account.meritPenalties || []).filter((p) => p.effect !== 'auto_suspend');
  for (const penalty of automatic) {
    flags.push(
      <Flag
        key={`auto-${penalty.id}`}
        icon={penalty.effect === 'mute' ? <VolumeX className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
        tone="border-sky-500/30 bg-sky-500/10 text-sky-200"
      >
        {penalty.label} (auto){penalty.endsAt ? ` until ${caseWhen(penalty.endsAt)}` : ''}
      </Flag>
    );
  }
  if (!automatic.length && account.warningBandLabel) {
    flags.push(
      <Flag key="band" icon={<ShieldAlert className="h-3 w-3" />} tone="border-sky-500/30 bg-sky-500/10 text-sky-200">
        {account.warningBandLabel}
        {account.warningBandEndsAt ? ` until ${caseDay(account.warningBandEndsAt)}` : ''}
      </Flag>
    );
  }
  if (account.forumTimeout) {
    flags.push(
      <Flag key="timeout" icon={<MessageSquareOff className="h-3 w-3" />} tone="border-amber-500/30 bg-amber-500/10 text-amber-200">
        Forum timeout{account.forumTimeoutEndsAt ? ` until ${caseWhen(account.forumTimeoutEndsAt)}` : ''}
      </Flag>
    );
  }
  if (account.creditsFrozen) {
    flags.push(
      <Flag key="hold" icon={<Coins className="h-3 w-3" />} tone="border-amber-500/30 bg-amber-500/10 text-amber-200">
        {account.frozenCredits.toLocaleString()} credits on hold
        {account.creditsFrozenUntil ? ` until ${caseDay(account.creditsFrozenUntil)}` : ''}
      </Flag>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          {label ? <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p> : null}
          <p className="flex items-center gap-1.5 truncate text-sm text-white">
            {account.name}
            {account.handle ? <span className="text-zinc-500">@{account.handle}</span> : null}
            {account.identityVerified ? (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-300" aria-label="Identity verified" />
            ) : null}
          </p>
        </div>
        <StatusPill status={status} />
      </div>

      <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-6'}`}>
        {[
          { label: 'Merit', value: account.merit ?? '—', tone: meritTone(account.merit) },
          { label: 'Active warnings', value: account.counts.activeWarnings, tone: account.counts.activeWarnings ? 'text-amber-300' : 'text-zinc-200' },
          { label: 'All warnings', value: account.counts.totalWarnings, tone: 'text-zinc-200' },
          ...(compact
            ? []
            : [
                { label: 'Disputes', value: account.counts.totalDisputes, tone: 'text-zinc-200' },
                { label: 'Reports against', value: account.counts.reportsAgainst, tone: account.counts.reportsAgainst ? 'text-amber-300' : 'text-zinc-200' },
                { label: 'Tickets', value: account.counts.totalTickets, tone: 'text-zinc-200' },
              ]),
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">{item.label}</p>
            <p className={`text-sm font-semibold tabular-nums ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {flags.length ? <div className="flex flex-wrap gap-1.5">{flags}</div> : null}
      {account.creditsFrozen && account.creditsFrozenReason ? (
        <p className="text-[11px] text-zinc-500">Hold reason: {account.creditsFrozenReason}</p>
      ) : null}
      {!compact ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> Joined {caseDay(account.joinedAt)}
          </span>
          <span>{account.identityVerified ? `ID verified ${caseDay(account.identityVerifiedAt)}` : 'ID not verified'}</span>
          {account.counts.openDisputesAgainst ? (
            <span className="text-amber-300">{account.counts.openDisputesAgainst} open dispute(s) against them</span>
          ) : null}
          {account.deactivated ? <span>Deactivated by the member</span> : null}
        </p>
      ) : null}
    </div>
  );
}
