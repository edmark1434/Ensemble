import RestrictedWorkDesk from '../shared/RestrictedWorkDesk';

/** Live contracts with a suspended, locked or banned side (docs/punishment-system.md §9). */
export default function SupportRestrictedWork() {
  return <RestrictedWorkDesk accent="sky" consoleBase="/moderator/support" eyebrow="Support · live work" />;
}
