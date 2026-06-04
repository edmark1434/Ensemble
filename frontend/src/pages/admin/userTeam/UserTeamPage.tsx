import { useEffect, useState } from 'react';
import { RefreshCw, Search, UserCircle, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import useGlobalState from '@/lib/global_state';
import TeamsTab from './TeamsTab';
import UsersTab from './UsersTab';

type TabId = 'teams' | 'users';

const TABS: { id: TabId; label: string; icon: typeof Users }[] = [
  { id: 'teams', label: 'Team accounts', icon: Users },
  { id: 'users', label: 'Platform users', icon: UserCircle },
];

export default function UserTeamPage() {
  const { user } = useGlobalState();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get('tab');
  const initialTab: TabId = paramTab === 'users' ? 'users' : 'teams';

  const [tab, setTab] = useState<TabId>(initialTab);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [teamsPending, setTeamsPending] = useState(0);
  const [usersPending, setUsersPending] = useState(0);

  useEffect(() => {
    const next: TabId = paramTab === 'users' ? 'users' : 'teams';
    setTab(next);
  }, [paramTab]);

  const switchTab = (id: TabId) => {
    setTab(id);
    setSearchParams(id === 'users' ? { tab: 'users' } : {}, { replace: true });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshToken((t) => t + 1);
    setTimeout(() => setRefreshing(false), 400);
  };

  const pendingBadge = tab === 'teams' ? teamsPending : usersPending;

  return (
    <main className="min-h-screen md:pl-[260px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between md:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/80">
              User & team
            </p>
            <h1 className="text-xl font-bold text-white">Account management</h1>
            <p className="mt-1 text-xs text-zinc-500">
              Signed in as @{user?.username || 'admin'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 lg:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name / email / id…"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
              />
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto px-4 pb-0 md:px-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                tab === id
                  ? 'border-rose-400 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {id === tab && pendingBadge > 0 && (
                <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] font-bold text-amber-200">
                  {pendingBadge}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        {tab === 'teams' && (
          <TeamsTab
            search={search}
            refreshToken={refreshToken}
            onStatsLoaded={setTeamsPending}
          />
        )}
        {tab === 'users' && (
          <UsersTab
            search={search}
            refreshToken={refreshToken}
            onStatsLoaded={setUsersPending}
          />
        )}
      </div>
    </main>
  );
}
