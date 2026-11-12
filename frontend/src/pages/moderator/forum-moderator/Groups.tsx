import { Navigate } from 'react-router-dom';

/** Legacy path — Forum Groups now lives under Forum Control. */
export default function ForumGroups() {
  return <Navigate to="/moderator/forum/forum-control?view=groups" replace />;
}
