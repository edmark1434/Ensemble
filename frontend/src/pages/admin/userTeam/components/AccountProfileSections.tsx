import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Eye } from 'lucide-react';
import api from '@/lib/axios';
import { staffPlatformViewHref } from '@/lib/staffRoutes';
import { formatDateTime } from '../formatDateTime';
import type { AdminAccountProfile, StatusBreakdown, TeamRosterMember } from '../userTeamTypes';

/** Loads the on-demand profile details for one account; stale responses are ignored. */
export function useAccountProfile(accountId: string | null | undefined) {
  const [profile, setProfile] = useState<AdminAccountProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!accountId) return;
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/admin/accounts/${accountId}/profile`);
      if (id !== requestId.current) return;
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load profile');
      setProfile(res.data.data as AdminAccountProfile);
    } catch (err) {
      if (id !== requestId.current) return;
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        'Failed to load profile details';
      setError(message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    setProfile(null);
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  return { profile, loading, error, reload: load };
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">{children}</p>
      {aside}
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase text-zinc-600">{label}</p>
      <p className="font-semibold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-zinc-500">{hint}</p>}
    </div>
  );
}

function credits(value: number | null | undefined) {
  return Number(value || 0).toLocaleString();
}

function breakdownHint(breakdown: StatusBreakdown | undefined) {
  if (!breakdown || breakdown.total === 0) return undefined;
  return Object.entries(breakdown.byStatus)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => `${count} ${status.toLowerCase()}`)
    .join(' · ');
}

export function ProfileDetailsState({ loading, error, onRetry }: { loading: boolean; error: string; onRetry: () => void }) {
  if (loading) {
    return (
      <p className="mt-6 rounded-xl border border-white/[0.08] px-4 py-4 text-sm text-zinc-400">
        Loading profile details…
      </p>
    );
  }
  if (error) {
    return (
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-200">
        <span>{error}</span>
        <button type="button" onClick={onRetry} className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white">
          Retry
        </button>
      </div>
    );
  }
  return null;
}

/** Opens the member's public page inside the console's platform view tab. */
export function PublicProfileLink({ memberPath }: { memberPath: string }) {
  const { pathname } = useLocation();
  return (
    <Link
      to={staffPlatformViewHref(pathname, memberPath)}
      className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-white hover:bg-white/[0.05]"
    >
      <Eye className="h-4 w-4" />
      Public profile
    </Link>
  );
}

/** Live penalty, warning band and credit hold, with end dates. */
export function StandingSection({ profile }: { profile: AdminAccountProfile }) {
  const s = profile.standing;
  if (!s) return null;

  const rows: { label: string; value: string; tone: string }[] = [];
  if (s.banEndsAt || String(s.status).toLowerCase() === 'banned') {
    rows.push({ label: 'Banned', value: s.banEndsAt ? `until ${formatDateTime(s.banEndsAt)}` : 'permanently', tone: 'text-rose-300' });
  }
  if (s.lockEndsAt || String(s.status).toLowerCase() === 'locked') {
    rows.push({ label: 'Locked', value: s.lockEndsAt ? `until ${formatDateTime(s.lockEndsAt)}` : 'until lifted', tone: 'text-rose-300' });
  }
  if (s.suspensionEndsAt || String(s.status).toLowerCase() === 'suspended') {
    rows.push({ label: 'Suspended', value: s.suspensionEndsAt ? `until ${formatDateTime(s.suspensionEndsAt)}` : 'until lifted', tone: 'text-amber-300' });
  }
  if (s.forumTimeout) {
    rows.push({ label: 'Forum timeout', value: s.forumTimeoutEndsAt ? `until ${formatDateTime(s.forumTimeoutEndsAt)}` : 'until lifted', tone: 'text-amber-300' });
  }
  // Automatic merit punishments: each runs a fixed time, whatever merit does afterwards.
  const automatic = (s.meritPenalties || []).filter((p) => p.effect !== 'auto_suspend');
  for (const p of automatic) {
    rows.push({
      label: `Automatic: ${p.label}`,
      value: `${p.endsAt ? `until ${formatDateTime(p.endsAt)}` : 'running'}${p.triggerMerit != null ? ` · rule at merit ${p.triggerMerit}` : ''}${p.meritAtStart != null ? ` · started at merit ${p.meritAtStart}` : ''}`,
      tone: 'text-amber-300',
    });
  }
  if (!automatic.length && s.warningBandLabel) {
    // Before the timed-punishment migration the band still follows points.
    rows.push({
      label: `Warning band: ${s.warningBandLabel}`,
      value: `${s.warningPoints} active point${s.warningPoints === 1 ? '' : 's'}`,
      tone: 'text-amber-300',
    });
  }
  if (s.creditsFrozen) {
    rows.push({
      label: 'Credit hold',
      value: `${credits(s.frozenCredits)} credits ${s.creditsFrozenUntil ? `until ${formatDateTime(s.creditsFrozenUntil)}` : 'until staff review'}${s.creditsFrozenReason ? ` · ${s.creditsFrozenReason}` : ''}`,
      tone: 'text-amber-300',
    });
  }
  if (s.returnsToDeactivated) {
    rows.push({ label: 'Deactivated by member', value: 'returns to Deactivated when the penalty ends', tone: 'text-zinc-300' });
  } else if (s.deactivatedAt) {
    rows.push({ label: 'Deactivated', value: `since ${formatDateTime(s.deactivatedAt)}`, tone: 'text-zinc-300' });
  }

  return (
    <>
      <SectionTitle>Current standing</SectionTitle>
      {rows.length === 0 ? (
        <p className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200">
          {s.status} · no active penalties, warning band or credit hold.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {rows.map((row) => (
            <li key={row.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm">
              <span className={`font-semibold ${row.tone}`}>{row.label}</span>
              <span className="text-zinc-400"> · {row.value}</span>
            </li>
          ))}
          {s.message && <li className="px-1 text-xs text-zinc-500">Member sees: “{s.message}”</li>}
        </ul>
      )}
    </>
  );
}

/** Jobs, gigs, proposals, contracts, listings, reviews and followers. */
export function WorkSection({ profile }: { profile: AdminAccountProfile }) {
  const w = profile.work;
  if (!w) return null;
  return (
    <>
      <SectionTitle>Work & marketplace</SectionTitle>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Jobs posted" value={w.jobs.total} hint={breakdownHint(w.jobs)} />
        <StatTile label="Gigs / services" value={w.gigs.total} hint={breakdownHint(w.gigs)} />
        <StatTile label="Proposals sent" value={w.proposals.total} hint={breakdownHint(w.proposals)} />
        <StatTile label="Asset listings" value={w.listings.total} hint={breakdownHint(w.listings)} />
        <StatTile label="Contracts as client" value={w.contractsAsClient.total} hint={breakdownHint(w.contractsAsClient)} />
        <StatTile label="Contracts as freelancer" value={w.contractsAsFreelancer.total} hint={breakdownHint(w.contractsAsFreelancer)} />
        <StatTile
          label="Rating"
          value={w.rating.count ? `${w.rating.average.toFixed(1)} / 5` : '—'}
          hint={`${w.rating.count} review${w.rating.count === 1 ? '' : 's'}`}
        />
        <StatTile label="Followers" value={w.followers} hint={`Following ${w.following}`} />
      </div>
    </>
  );
}

/** Lifetime completed credit movement on the account wallet. */
export function CreditTotalsSection({
  profile,
  walletBalance,
  frozenBalance,
}: {
  profile: AdminAccountProfile | null;
  walletBalance: number;
  frozenBalance: number;
}) {
  const c = profile?.credits ?? null;
  return (
    <>
      <SectionTitle>Credits</SectionTitle>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Wallet balance" value={credits(walletBalance)} />
        <StatTile label="Frozen credits" value={credits(frozenBalance)} />
        {profile?.budgetCredits != null && <StatTile label="Stated budget" value={credits(profile.budgetCredits)} />}
        {c && (
          <>
            <StatTile label="Contract earnings" value={credits(c.contractEarnings)} hint="Escrow released to wallet" />
            <StatTile label="Asset sales" value={credits(c.assetSales)} />
            <StatTile label="Asset purchases" value={credits(c.assetSpending)} />
            <StatTile label="Cashed out" value={credits(c.cashedOut)} />
            <StatTile
              label="Total in / out"
              value={`${credits(c.totalReceived)} / ${credits(c.totalSent)}`}
              hint={c.lastTransactionAt ? `Last ${formatDateTime(c.lastTransactionAt)}` : 'No transactions'}
            />
          </>
        )}
      </div>
    </>
  );
}

/** Forum and project activity for a member. */
export function CommunitySection({ profile }: { profile: AdminAccountProfile }) {
  const f = profile.forum;
  const p = profile.projects;
  if (!f && !p) return null;
  return (
    <>
      <SectionTitle>Community & projects</SectionTitle>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {f?.available ? (
          <>
            <StatTile label="Discussions" value={f.discussions} />
            <StatTile label="Comments" value={f.comments} />
            <StatTile label="Likes received" value={f.likesReceived} />
            <StatTile label="Saves received" value={f.savesReceived} />
          </>
        ) : (
          <div className="col-span-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-zinc-500 sm:col-span-3 lg:col-span-4">
            Forum activity is unavailable right now.
          </div>
        )}
        {p && (
          <>
            <StatTile label="Projects owned" value={p.owned} />
            <StatTile label="Projects joined" value={p.member} />
          </>
        )}
      </div>
    </>
  );
}

/** Member-entered links open only when they are plain http(s) URLs. */
function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function memberStatusTone(status: string) {
  const s = status.toLowerCase();
  if (s === 'active') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200';
  if (s === 'pending') return 'border-amber-500/20 bg-amber-500/10 text-amber-200';
  return 'border-white/10 text-zinc-400';
}

/** Team settings and the full roster, including pending invites. */
export function TeamRosterSection({
  profile,
  renderAvatar,
}: {
  profile: AdminAccountProfile;
  renderAvatar: (member: TeamRosterMember) => ReactNode;
}) {
  const t = profile.team;
  if (!t) return null;
  const settings = t.settings;
  const settingRows: [string, ReactNode][] = settings
    ? [
        ['Visibility', settings.visibility || '—'],
        ['Join policy', settings.joinPolicy || '—'],
        ['Category', settings.category || '—'],
        ['Team type', settings.teamType || '—'],
        ['Location', settings.location || '—'],
        [
          'Website',
          safeExternalUrl(settings.website) ? (
            <a
              href={safeExternalUrl(settings.website) as string}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sky-300 hover:underline"
            >
              {settings.website}
            </a>
          ) : (
            settings.website || '—'
          ),
        ],
        ['Settings updated', formatDateTime(settings.updatedAt)],
      ]
    : [];

  return (
    <>
      {settingRows.length > 0 && (
        <>
          <SectionTitle>Team settings</SectionTitle>
          <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {settingRows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-zinc-500">{label}</dt>
                <dd className="min-w-0 truncate text-right text-zinc-300">{value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      <SectionTitle
        aside={
          <span className="text-xs text-zinc-500">
            {t.activeMemberCount} active{t.pendingInviteCount ? ` · ${t.pendingInviteCount} pending invite${t.pendingInviteCount === 1 ? '' : 's'}` : ''}
          </span>
        }
      >
        Members
      </SectionTitle>
      {t.members.length === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-white/[0.08] px-4 py-5 text-center text-sm text-zinc-500">
          No members linked yet.
        </p>
      ) : (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {t.members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              {renderAvatar(m)}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">{m.name}</p>
                <p className="truncate text-xs text-zinc-500">
                  {m.username ? `@${m.username}` : '—'}
                  {m.email ? ` · ${m.email}` : ''}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-sky-200">{m.role}</span>
                  <span className={`rounded-full border px-2 py-0.5 ${memberStatusTone(m.status)}`}>{m.status}</span>
                  {m.accountStatus && m.accountStatus.toLowerCase() !== 'active' && (
                    <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-rose-200">
                      Account {m.accountStatus}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-zinc-600">
                  {String(m.status).toLowerCase() === 'pending'
                    ? `Invited ${formatDateTime(m.invitedAt)}${m.invitedByName ? ` by ${m.invitedByName}` : ''}${m.invitationExpiresAt ? ` · expires ${formatDateTime(m.invitationExpiresAt)}` : ''}`
                    : `Joined ${formatDateTime(m.joinedAt)}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
