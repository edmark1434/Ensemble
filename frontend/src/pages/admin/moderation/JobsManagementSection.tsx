import JobsGigsControl from '@/pages/moderator/jobs-moderator/JobsGigsControl';

/**
 * Moderation → Management → Jobs & Gigs.
 *
 * Shares Jobs & Gigs Control with the Jobs moderator desk; only the API root
 * differs so admin and mod cannot drift apart.
 */
export default function JobsManagementSection() {
  return <JobsGigsControl apiBase="/api/admin/moderation/jobs" embedded />;
}
