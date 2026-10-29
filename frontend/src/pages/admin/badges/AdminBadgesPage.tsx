import { Award, Library } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import BadgeCatalogTab from './BadgeCatalogTab';
import BadgeGrantTab from './BadgeGrantTab';

type TabId = 'catalog' | 'grant';

const TABS: { id: TabId; label: string; icon: typeof Library }[] = [
  { id: 'catalog', label: 'Catalog', icon: Library },
  { id: 'grant', label: 'Grant', icon: Award },
];

export default function AdminBadgesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get('tab') as TabId | null;
  const initialTab = paramTab === 'grant' ? 'grant' : 'catalog';
  const [tab, setTab] = useState<TabId>(initialTab);

  useEffect(() => {
    setTab(paramTab === 'grant' ? 'grant' : 'catalog');
  }, [paramTab]);

  const switchTab = (id: TabId) => {
    setTab(id);
    setSearchParams(id === 'catalog' ? {} : { tab: id }, { replace: true });
  };

  return (
    <main className="min-h-screen md:pl-[260px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="px-6 py-4 md:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/80">Admin</p>
          <h1 className="text-xl font-bold text-white">Badges</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Each badge stores one unlock on the same row. Grant or revoke from the Grant tab. Users claim pending badges in Notifications.
          </p>
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
            </button>
          ))}
        </div>
      </header>

      <div className="px-6 py-6 md:px-8 md:py-8">
        {tab === 'catalog' && <BadgeCatalogTab />}
        {tab === 'grant' && <BadgeGrantTab />}
      </div>
    </main>
  );
}
