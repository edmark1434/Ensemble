import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, UserCircle, Users } from 'lucide-react';
import api from '@/lib/axios';
import StatCards from './components/StatCards';
import { formatDateTime } from './formatDateTime';

type OverviewData = {
  lastUpdated: string;
  teamStats: {
    totalTeams: number;
    totalActive: number;
    totalPendingVerification: number;
    totalSuspended: number;
    totalVerifiedBusinesses: number;
  };
  userStats: {
    totalUsers: number;
    totalActive: number;
    totalPendingVerification: number;
    totalSuspended: number;
    totalVerified: number;
  };
  totals: {
    teams: number;
    users: number;
    combinedPending: number;
    activeTeams: number;
    activeUsers: number;
  };
  verificationBreakdown: {
    verified: number;
    partial: number;
    unverified: number;
    pending: number;
  };
  recentSignups: {
    id: number;
    name: string;
    username: string;
    status: string;
    verificationStatus: string;
    joinedAt: string | null;
  }[];
  spotlightTeams: {
    id: string;
    name: string;
    leaderName: string;
    memberCount: number;
    status: string;
    verificationStatus: string;
  }[];
  statusBreakdown: {
    users: { label: string; count: number }[];
    teams: { label: string; count: number }[];
  };
  alerts: { id: string; message: string; severity: string }[];
};

type UserTeamOverviewTabProps = {
  refreshToken?: number;
  onStatsLoaded?: (pending: number) => void;
  onGoUsers?: () => void;
  onGoTeams?: () => void;
};

export default function UserTeamOverviewTab({
  refreshToken = 0,
  onStatsLoaded,
  onGoUsers,
  onGoTeams,
}: UserTeamOverviewTabProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/admin/user-team-overview');
        if (res.data?.success) {
          setData(res.data.data);
          onStatsLoaded?.(res.data.data.totals.combinedPending);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [refreshToken, onStatsLoaded]);

  if (loading) {
    return <p className="py-12 text-center text-sm text-zinc-500">Loading overview…</p>;
  }

  if (!data) {
    return <p className="py-12 text-center text-sm text-red-300">Failed to load overview.</p>;
  }

  const v = data.verificationBreakdown;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {data.alerts.map((a) => (
          <span
            key={a.id}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
              a.severity === 'warning'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                : a.severity === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  : 'border-white/10 bg-white/[0.03] text-zinc-300'
            }`}
          >
            {a.severity === 'success' ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            {a.message}
          </span>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Platform users', value: data.totals.users, sub: `${data.totals.activeUsers} active`, icon: UserCircle },
          { label: 'Production teams', value: data.totals.teams, sub: `${data.totals.activeTeams} active`, icon: Users },
          { label: 'Pending verification', value: data.totals.combinedPending, sub: 'Users + teams', icon: AlertTriangle },
          { label: 'Verified users', value: data.userStats.totalVerified, sub: `${data.teamStats.totalVerifiedBusinesses} verified teams`, icon: CheckCircle2 },
        ].map(({ label, value, sub, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
                <p className="mt-2 text-3xl font-bold text-white">{value}</p>
                <p className="mt-1 text-xs text-zinc-500">{sub}</p>
              </div>
              <Icon className="h-5 w-5 text-rose-400" />
            </div>
          </div>
        ))}
      </div>

      <StatCards
        cards={[
          [
            { label: 'Users suspended', value: data.userStats.totalSuspended },
            { label: 'Users banned', value: data.userStats.totalBanned },
          ],
          [
            { label: 'Teams suspended', value: data.teamStats.totalSuspended },
            { label: 'Teams banned', value: data.teamStats.totalBanned },
          ],
          [
            { label: 'User verifications pending', value: data.userStats.totalPendingVerification },
            { label: 'Team verifications pending', value: data.teamStats.totalPendingVerification },
          ],
          [
            { label: 'Fully verified users', value: v.verified },
            { label: 'Partially verified', value: v.partial },
          ],
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">User status breakdown</h2>
            {onGoUsers && (
              <button type="button" onClick={onGoUsers} className="text-xs text-rose-400 hover:underline">
                View all users →
              </button>
            )}
          </div>
          <ul className="mt-4 space-y-2">
            {data.statusBreakdown.users.map((r) => (
              <li key={r.label} className="flex justify-between text-sm">
                <span className="text-zinc-400">{r.label}</span>
                <span className="font-semibold text-white">{r.count}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <p className="text-[10px] uppercase text-zinc-600">Identity linkage</p>
            <ul className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <li className="rounded-lg bg-white/[0.03] px-3 py-2">
                Verified <span className="float-right font-bold text-emerald-300">{v.verified}</span>
              </li>
              <li className="rounded-lg bg-white/[0.03] px-3 py-2">
                Partial <span className="float-right font-bold text-amber-300">{v.partial}</span>
              </li>
              <li className="rounded-lg bg-white/[0.03] px-3 py-2">
                Unverified <span className="float-right font-bold text-zinc-300">{v.unverified}</span>
              </li>
              <li className="rounded-lg bg-white/[0.03] px-3 py-2">
                Pending <span className="float-right font-bold text-zinc-300">{v.pending}</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Team status breakdown</h2>
            {onGoTeams && (
              <button type="button" onClick={onGoTeams} className="text-xs text-rose-400 hover:underline">
                View all teams →
              </button>
            )}
          </div>
          <ul className="mt-4 space-y-2">
            {data.statusBreakdown.teams.map((r) => (
              <li key={r.label} className="flex justify-between text-sm">
                <span className="text-zinc-400">{r.label}</span>
                <span className="font-semibold text-white">{r.count}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <p className="text-[10px] uppercase text-zinc-600">Spotlight teams</p>
            <ul className="mt-2 space-y-2">
              {data.spotlightTeams.map((t) => (
                <li key={t.id} className="rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                  <p className="font-medium text-white">{t.name}</p>
                  <p className="text-xs text-zinc-500">
                    {t.leaderName} · {t.memberCount} members · {t.verificationStatus}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <h2 className="font-semibold text-white">Latest signups</h2>
        <p className="mt-1 text-xs text-zinc-500">Most recent platform users from database</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wide text-zinc-600">
                <th className="pb-2 pr-4">Member</th>
                <th className="pb-2 pr-4">Username</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Verification</th>
                <th className="pb-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.recentSignups.map((s) => (
                <tr key={s.id} className="border-b border-white/[0.04] text-zinc-300">
                  <td className="py-2.5 pr-4 font-medium text-white">{s.name}</td>
                  <td className="py-2.5 pr-4">@{s.username}</td>
                  <td className="py-2.5 pr-4">{s.status}</td>
                  <td className="py-2.5 pr-4">{s.verificationStatus}</td>
                  <td className="py-2.5 text-xs text-zinc-500">{formatDateTime(s.joinedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
