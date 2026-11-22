import RestrictedWorkDesk from '../shared/RestrictedWorkDesk';

/** Live contracts with a suspended, locked or banned side (docs/punishment-system.md §9). */
export default function JobsRestrictedWork() {
  return <RestrictedWorkDesk accent="emerald" consoleBase="/moderator/jobs" eyebrow="Jobs & Gigs · live work" />;
}
