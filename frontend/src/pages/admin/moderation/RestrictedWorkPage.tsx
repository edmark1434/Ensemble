import RestrictedWorkDesk from '@/pages/moderator/shared/RestrictedWorkDesk';

/** Admin: live contracts with a suspended, locked or banned side (docs/punishment-system.md §9). */
export default function AdminRestrictedWorkPage() {
  return <RestrictedWorkDesk accent="rose" consoleBase="/admin" eyebrow="Admin · live work" />;
}
