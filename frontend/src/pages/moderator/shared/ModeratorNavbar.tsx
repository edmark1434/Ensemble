import { Eye, Sparkles } from 'lucide-react';
import type { ComponentType } from 'react';
import { platformViewPathForConsole, STAFF_LOGIN_PATH } from '@/lib/staffRoutes';
import ConsoleSidebar from '@/pages/staff/ConsoleSidebar';
import { MODERATOR_THEME, type ModeratorAccent, type ModeratorNavItem } from './ModeratorShell';

type Props = {
  accent: ModeratorAccent;
  title: string;
  homeTo: string;
  items: ModeratorNavItem[];
  BrandIcon?: ComponentType<{ className?: string }>;
};

/** Admin-console sidebar pattern with role-specific accent + menu items (and a mobile drawer). */
export default function ModeratorNavbar({ accent, title, homeTo, items, BrandIcon = Sparkles }: Props) {
  const theme = MODERATOR_THEME[accent];
  return (
    <ConsoleSidebar
      title={title}
      theme={{
        label: theme.label,
        brand: `${theme.brandGradient} ${theme.brandShadow}`,
        activeNav: theme.activeSolid,
        activeIconWrap: theme.activeIconWrap,
        indicator: theme.indicator,
      }}
      items={[...items, { label: 'Platform view', icon: Eye, to: platformViewPathForConsole(homeTo) }]}
      homeTo={homeTo}
      loginPath={STAFF_LOGIN_PATH}
      BrandIcon={BrandIcon}
    />
  );
}
