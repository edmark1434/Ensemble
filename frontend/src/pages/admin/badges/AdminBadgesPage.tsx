import { Award, Library } from 'lucide-react';
import { Navigate, useSearchParams } from 'react-router-dom';
import BadgeCatalogTab from './BadgeCatalogTab';
import BadgeGrantTab from './BadgeGrantTab';

export type BadgesSection = 'catalog' | 'grant';

export const BADGE_SETTINGS_SECTIONS: {
  id: BadgesSection;
  label: string;
  title: string;
  description: string;
  icon: typeof Library;
}[] = [
  {
    id: 'catalog',
    label: 'Catalog',
    title: 'Badge catalog',
    description: 'Each badge stores one unlock and belongs to a category.',
    icon: Library,
  },
  {
    id: 'grant',
    label: 'Grant',
    title: 'Grant & revoke',
    description: 'Issue pending badges or revoke holders. Users claim pending badges in Notifications.',
    icon: Award,
  },
];

/** Badges content for System Settings → Badges. */
export function AdminBadgesPanel({
  section,
  onSectionChange,
}: {
  section: BadgesSection;
  onSectionChange: (section: BadgesSection) => void;
}) {
  const meta = BADGE_SETTINGS_SECTIONS.find((s) => s.id === section) || BADGE_SETTINGS_SECTIONS[0];

  return (
    <div className="space-y-6">
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-white/[0.08] bg-[#14151c] p-1.5">
        {BADGE_SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSectionChange(id)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              section === id
                ? 'bg-rose-500/15 text-white shadow-[inset_0_0_0_1px_rgba(244,63,94,0.35)]'
                : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            <Icon className={`h-4 w-4 ${section === id ? 'text-rose-400' : ''}`} />
            {label}
          </button>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-bold text-white">{meta.title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{meta.description}</p>
      </div>

      {section === 'catalog' && <BadgeCatalogTab />}
      {section === 'grant' && <BadgeGrantTab />}
    </div>
  );
}

/** Legacy route → Settings Badges. */
export default function AdminBadgesPage() {
  const [searchParams] = useSearchParams();
  const grant = searchParams.get('tab') === 'grant';
  return (
    <Navigate
      to={grant ? '/admin/system-settings?tab=badges&section=grant' : '/admin/system-settings?tab=badges'}
      replace
    />
  );
}
