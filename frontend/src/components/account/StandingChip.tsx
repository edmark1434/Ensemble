import { standingBadges, type PublicStanding } from '@/pages/user/7_profile/Displays/AccountStanding';

/**
 * Compact public standing chip next to a member's name (forum posts, comments, member lists,
 * job / gig / asset authors). Shows only what docs/punishment-system.md §11 makes public:
 * Banned, Suspended, Locked and forum Timeout — never reasons, warnings or points. It follows
 * the member's current standing, so it disappears when the penalty ends.
 */

const TONE_CLASS: Record<'red' | 'amber' | 'zinc', string> = {
  red: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  zinc: 'border-zinc-400/40 bg-zinc-500/10 text-zinc-700 dark:text-zinc-200',
};

export default function StandingChip({
  standing,
  className = '',
}: {
  standing?: PublicStanding | null;
  className?: string;
}) {
  const badges = standingBadges(standing);
  if (badges.length === 0) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {badges.map((badge) => (
        <span
          key={badge.label}
          title={`${badge.label} ${badge.detail}`}
          className={`rounded border px-1.5 py-px text-[9px] font-bold uppercase leading-4 tracking-wide ${TONE_CLASS[badge.tone]}`}
        >
          {badge.label}
        </span>
      ))}
    </span>
  );
}
