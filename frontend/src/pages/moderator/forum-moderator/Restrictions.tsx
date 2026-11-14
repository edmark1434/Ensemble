import { Navigate } from 'react-router-dom';

/**
 * Legacy path — Forum Moderator no longer has a standalone Restrictions desk.
 * Warn / timeout / suspend stay on User & Team.
 */
export default function ForumRestrictions() {
  return <Navigate to="/moderator/forum/user-team" replace />;
}
