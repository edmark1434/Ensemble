import { useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw, UserCircle, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import useGlobalState from '@/lib/global_state';
import TeamsTab from './TeamsTab';
import UsersTab from './UsersTab';
import UserTeamOverviewTab from './UserTeamOverviewTab';
import { getUserTeamCapabilities, type UserTeamVariant } from './userTeamCapabilities';

type TabId = 'overview' | 'teams' | 'users';

const ALL_TABS: { id: TabId; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'teams', label: 'Team accounts', icon: Users },
  { id: 'users', label: 'Platform users', icon: UserCircle },
];

const VARIANT_META: Record<
  UserTeamVariant,
  { label: string; accentLabel: string; accentTab: string; fallbackUser: string }
> = {
  admin: {
    label: 'User & team',
    accentLabel: 'text-rose-400/80',
    accentTab: 'border-rose-400 text-white',
    fallbackUser: 'admin',
  },
  support: {
    label: 'Support Moderator · User & team',
    accentLabel: 'text-sky-400/80',
    accentTab: 'border-sky-400 text-white',
    fallbackUser: 'support',
  },
  forum: {
    label: 'Forum Moderator · User enforcement',
    accentLabel: 'text-violet-400/80',
    accentTab: 'border-violet-400 text-white',
    fallbackUser: 'forum',
  },
  marketplace: {
    label: 'Marketplace Moderator · User enforcement',
    accentLabel: 'text-amber-400/80',
    accentTab: 'border-amber-400 text-white',
    fallbackUser: 'marketplace',
  },
};

export default function UserTeamPage({ variant = 'admin' }: { variant?: UserTeamVariant }) {
  const { user } = useGlobalState();
  const caps = useMemo(() => getUserTeamCapabilities(variant), [variant]);
  const meta = VARIANT_META[variant];
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get('tab') as TabId | null;
  const tabs = useMemo(
    () => ALL_TABS.filter((t) => (t.id === 'teams' ? caps.showTeamsTab : true)),
    [caps.showTeamsTab]
  );
  const valid = useMemo(() => tabs.map((t) => t.id), [tabs]);
  const initialTab = paramTab && valid.includes(paramTab) ? paramTab : 'overview';
  const shellPad = 'md:pl-[260px]';

  const [tab, setTab] = useState<TabId>(initialTab);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [overviewPending, setOverviewPending] = useState(0);
  const [teamsPending, setTeamsPending] = useState(0);
  const [usersPending, setUsersPending] = useState(0);

  useEffect(() => {
    if (paramTab && valid.includes(paramTab)) setTab(paramTab);
    else if (!paramTab || !valid.includes(paramTab as TabId)) setTab('overview');
  }, [paramTab, valid]);

  const switchTab = (id: TabId) => {
    setTab(id);
    setSearchParams(id === 'overview' ? {} : { tab: id }, { replace: true });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshToken((t) => t + 1);
    setTimeout(() => setRefreshing(false), 400);
  };

  const pendingBadge =
    tab === 'overview' ? overviewPending : tab === 'teams' ? teamsPending : usersPending;

  return (
    <main className={`min-h-screen ${shellPad}`}>
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between md:px-8">
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${meta.accentLabel}`}>
              {meta.label}
            </p>
            <h1 className="text-xl font-bold text-white">
              {variant === 'forum' || variant === 'marketplace'
                ? 'Account enforcement'
                : 'Account management'}
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              Signed in as @{user?.username || meta.fallbackUser}
              {variant === 'forum' || variant === 'marketplace'
                ? ' · Warn, suspend, and lock only — no bans, credits, or team management'
                : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 self-start rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto px-4 pb-0 md:px-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                tab === id
                  ? meta.accentTab
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {id === tab && pendingBadge > 0 && id !== 'overview' && (
                <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] font-bold text-amber-200">
                  {pendingBadge}
                </span>
              )}
              {id === 'overview' && overviewPending > 0 && tab === 'overview' && (
                <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] font-bold text-amber-200">
                  {overviewPending}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        {tab === 'overview' && (
          <UserTeamOverviewTab
            refreshToken={refreshToken}
            onStatsLoaded={setOverviewPending}
            onGoUsers={() => switchTab('users')}
            onGoTeams={caps.showTeamsTab ? () => switchTab('teams') : undefined}
            showTeams={caps.showTeamsTab}
          />
        )}
        {tab === 'teams' && caps.showTeamsTab && (
          <TeamsTab refreshToken={refreshToken} onStatsLoaded={setTeamsPending} />
        )}
        {tab === 'users' && (
          <UsersTab
            refreshToken={refreshToken}
            onStatsLoaded={setUsersPending}
            capabilities={caps}
          />
        )}
      </div>
    </main>
  );
}
