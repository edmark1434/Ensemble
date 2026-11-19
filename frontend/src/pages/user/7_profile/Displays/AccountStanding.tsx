import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/axios';
import { DEFAULT_MERIT, isActiveWarning, meritBandLabel, meritFromWarnings } from '@/lib/merit';

export type PublicStanding = {
  status?: string | null;
  endsAt?: string | null;
  forumTimeout?: boolean;
  forumTimeoutEndsAt?: string | null;
  banReason?: string | null;
  banDispute?: { id: string; number?: string | null } | null;
  underDispute?: boolean;
  underDisputeId?: string | null;
  underDisputeNumber?: string | null;
  merit?: number;
};

type WarningRow = {
  id: string;
  number?: string;
  type?: string;
  reason?: string | null;
  points?: number;
  /** Merit it took when issued, if staff have since lifted some or all of it. */
  originalPoints?: number | null;
  status?: string;
  createdAt?: string;
  expiresAt?: string | null;
};

type RestrictionRow = {
  id: string;
  type?: string;
  module?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt?: string;
};

type ActivityRow = {
  action?: string;
  eventCode?: string;
  createdAt?: string;
  endsAt?: string | null;
};

/** An automatic punishment Platform Merit started (timed; it does not follow merit). */
type PunishmentRow = {
  id: string;
  effect: string;
  label: string;
  durationDays?: number;
  triggerMerit?: number;
  meritAtStart?: number;
  startsAt?: string;
  endsAt?: string;
  endedAt?: string | null;
  endReason?: string | null;
  running?: boolean;
};

type OwnRecord = PublicStanding & {
  warnings: WarningRow[];
  restrictions: RestrictionRow[];
  activity: ActivityRow[];
  punishments?: PunishmentRow[];
};

const PUNISHMENT_END: Record<string, string> = {
  expired: 'ran its full time',
  staff: 'ended early by staff',
  pardoned: 'ended by a pardon',
  appeal: 'ended after your appeal',
  rescinded: 'ended: the warning behind it was withdrawn',
  reversed: 'ended: the warning behind it was withdrawn',
  rebalanced: 'ended when the punishment rules were eased',
};

function formatWhen(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function untilText(value?: string | null) {
  return value ? `until ${formatWhen(value)}` : 'until staff remove it';
}

function badgeClass(tone: 'red' | 'amber' | 'zinc') {
  if (tone === 'red') return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200';
  if (tone === 'amber') return 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200';
  return 'border-zinc-400/40 bg-zinc-500/10 text-zinc-700 dark:text-zinc-200';
}

export function standingBadges(standing?: PublicStanding | null) {
  if (!standing) return [];
  const status = String(standing.status || '').toLowerCase();
  const badges: { label: string; detail: string; tone: 'red' | 'amber' | 'zinc' }[] = [];
  if (status === 'banned') badges.push({ label: 'Banned', detail: untilText(standing.endsAt), tone: 'red' });
  if (status === 'suspended') badges.push({ label: 'Suspended', detail: untilText(standing.endsAt), tone: 'amber' });
  if (status === 'locked') badges.push({ label: 'Locked', detail: untilText(standing.endsAt), tone: 'zinc' });
  if (standing.forumTimeout) {
    badges.push({ label: 'Timeout', detail: untilText(standing.forumTimeoutEndsAt), tone: 'amber' });
  }
  // Open disputes are listed on the Disputes tab — not as a header badge.
  return badges;
}

export function BanNotice({ standing }: { standing?: PublicStanding | null }) {
  const status = String(standing?.status || '').toLowerCase();
  if (status !== 'banned' || !standing?.banReason) return null;
  const dispute = standing.banDispute;
  return (
    <p className="max-w-xl text-xs leading-relaxed text-red-800 dark:text-red-200">
      Reason: {standing.banReason}
      {dispute?.id ? (
        <>
          {' '}
          <Link to={`/disputes/${dispute.id}`} className="font-semibold underline">
            {dispute.number || 'View dispute discussion'}
          </Link>
        </>
      ) : null}
    </p>
  );
}

export function StandingBadges({ standing }: { standing?: PublicStanding | null }) {
  const badges = standingBadges(standing);
  if (badges.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-center gap-1.5 md:justify-start">
        {badges.map((badge) => (
          <span
            key={badge.label}
            title={`${badge.label} ${badge.detail}`}
            className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass(badge.tone)}`}
          >
            {badge.label}
          </span>
        ))}
      </div>
      <BanNotice standing={standing} />
    </div>
  );
}

export function AccountRecordSection({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const [record, setRecord] = useState<OwnRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/api/users/me/standing')
      .then((res) => {
        if (!cancelled) setRecord(res.data?.data || null);
      })
      .catch(() => {
        if (!cancelled) setError('Your account record could not be loaded.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const badges = standingBadges(record);
  // The backend merit is authoritative (the warnings list is capped and only a recent slice).
  const displayedMerit = record
    ? Number.isFinite(Number(record.merit))
      ? Number(record.merit)
      : meritFromWarnings(record.warnings)
    : DEFAULT_MERIT;

  return (
    <div>
      {!hideHeader ? (
        <>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account record</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">
            Your merit, warnings, suspensions, locks, timeouts, and bans. Other people only see the public badges.
          </p>
        </>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
      {!record && !error ? <p className="mt-3 text-sm text-gray-500">Loading your record…</p> : null}
      {record ? (
        <div className="mt-4 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">Platform Merit</p>
            <p className="mt-2 text-sm text-gray-800 dark:text-zinc-200">
              {displayedMerit} / {DEFAULT_MERIT}
              <span className="text-gray-500 dark:text-zinc-500"> · {meritBandLabel(displayedMerit)}</span>
            </p>
            {(() => {
              const running = (record.punishments || []).filter((item) => item.running);
              return (
                <p
                  className={`mt-1 text-sm ${
                    running.length ? 'text-amber-800 dark:text-amber-200' : 'text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {running.length
                    ? `Running now: ${running
                        .map((item) => `${item.label}${item.endsAt ? ` until ${formatWhen(item.endsAt)}` : ''}`)
                        .join(' · ')}`
                    : 'No automatic limits running.'}
                </p>
              );
            })()}
            <p className="mt-1 text-xs text-gray-500">
              Starts at {DEFAULT_MERIT}. Only unexpired warnings lower it. When it drops to certain levels an
              automatic punishment starts for a set number of days; it runs its full time even after merit recovers.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">Current standing</p>
            {badges.length === 0 ? (
              <p className="mt-2 text-sm text-gray-700 dark:text-zinc-300">Active. No ban, suspension, lock, or timeout.</p>
            ) : (
              <>
                <ul className="mt-2 space-y-1 text-sm text-gray-800 dark:text-zinc-200">
                  {badges.map((badge) => (
                    <li key={badge.label}>{badge.label} {badge.detail}</li>
                  ))}
                </ul>
                <div className="mt-2">
                  <BanNotice standing={record} />
                </div>
              </>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">Warnings</p>
            {record.warnings.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">No warnings on this account.</p>
            ) : (
              <ul className="mt-2 space-y-3">
                {record.warnings.map((warning) => (
                  <li key={warning.id} className="rounded-xl border border-gray-200 px-3 py-2 dark:border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{warning.type || 'Warning'}</p>
                      <span className="text-[10px] uppercase tracking-wide text-gray-500">
                        {String(warning.status || '').toLowerCase() === 'lifted' ? 'lifted' : warning.status}
                      </span>
                    </div>
                    {warning.reason ? <p className="mt-1 text-sm text-gray-700 dark:text-zinc-300">{warning.reason}</p> : null}
                    <p className="mt-1 text-xs text-gray-500">
                      {warning.number ? `${warning.number} · ` : ''}
                      {Number(warning.points) > 0
                        ? isActiveWarning(warning)
                          ? `−${warning.points} merit · `
                          : `no longer deducts merit · `
                        : ''}
                      {isActiveWarning(warning) && warning.originalPoints != null && Number(warning.originalPoints) > Number(warning.points)
                        ? `staff gave back ${Number(warning.originalPoints) - Number(warning.points)} of ${warning.originalPoints} merit · `
                        : ''}
                      {formatWhen(warning.createdAt)}
                      {warning.expiresAt ? ` · expires ${formatWhen(warning.expiresAt)}` : ' · stays until rescinded'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">Automatic punishments</p>
            {!record.punishments?.length ? (
              <p className="mt-2 text-sm text-gray-500">No automatic punishments on this account.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {record.punishments.map((item) => (
                  <li key={item.id} className="rounded-xl border border-gray-200 px-3 py-2 dark:border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.label}
                        {item.durationDays ? ` · ${item.durationDays} day${item.durationDays === 1 ? '' : 's'}` : ''}
                      </p>
                      <span
                        className={`text-[10px] uppercase tracking-wide ${
                          item.running ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500'
                        }`}
                      >
                        {item.running ? 'running' : 'ended'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.meritAtStart != null ? `Started at merit ${item.meritAtStart}` : 'Started'}
                      {item.startsAt ? ` on ${formatWhen(item.startsAt)}` : ''}
                      {item.running
                        ? item.endsAt
                          ? ` · ends ${formatWhen(item.endsAt)}`
                          : ''
                        : ` · ${PUNISHMENT_END[item.endReason || 'expired'] || 'ended'}${
                            item.endedAt ? ` ${formatWhen(item.endedAt)}` : ''
                          }`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">Timeouts</p>
            {record.restrictions.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">No timeouts on this account.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {record.restrictions.map((item) => (
                  <li key={item.id} className="text-sm text-gray-800 dark:text-zinc-200">
                    {item.type || 'Restriction'}
                    {item.module ? ` · ${item.module}` : ''}
                    {' · '}
                    {item.endsAt ? `ended or ends ${formatWhen(item.endsAt)}` : 'until staff remove it'}
                    {item.createdAt ? ` · issued ${formatWhen(item.createdAt)}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">Recent changes</p>
            {record.activity.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">No standing changes yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {record.activity.map((item, index) => (
                  <li key={`${item.eventCode}-${item.createdAt}-${index}`} className="text-sm text-gray-800 dark:text-zinc-200">
                    {item.action}
                    <span className="text-xs text-gray-500"> · {formatWhen(item.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
