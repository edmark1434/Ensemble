import api from '@/lib/axios';
import type {
  PlatformTeam,
  PlatformUserAccount,
  VerificationDetail,
} from '../userTeam/userTeamTypes';
import type { ModerationCase } from './moderationTypes';

/** What `VerificationModal` needs to open an identity or business verification case. */
export type VerificationSubject = {
  name: string;
  accountId: string;
  verification: VerificationDetail;
};

export function isBusinessVerification(c: ModerationCase) {
  return c.verificationKind === 'business';
}

/** Loads the member (identity) or team (business) account behind a verification case. */
export async function loadVerificationSubject(c: ModerationCase): Promise<VerificationSubject> {
  if (!c.accountId) throw new Error('This verification case has no linked account');

  if (isBusinessVerification(c)) {
    const res = await api.get('/api/admin/teams-management');
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load team');
    const team = (res.data.data.teams as PlatformTeam[]).find(
      (t) => String(t.accountId) === String(c.accountId)
    );
    if (!team) throw new Error('Team not found for this business verification case');
    return { name: team.name, accountId: team.accountId, verification: team.verification };
  }

  const res = await api.get('/api/admin/users-management');
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load user');
  const user = (res.data.data.users as PlatformUserAccount[]).find(
    (u) => String(u.accountId) === String(c.accountId)
  );
  if (!user) throw new Error('User not found for this verification case');
  return { name: user.name, accountId: user.accountId, verification: user.verification };
}
