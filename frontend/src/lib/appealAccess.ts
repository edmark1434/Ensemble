type AppealUser = {
  type?: string;
  status?: string;
  restriction?: {
    banned?: boolean;
    locked?: boolean;
    blocked?: boolean;
    code?: string;
  } | null;
} | null | undefined;

/** Banned and locked members stay signed in only for appeals, tickets, and disputes. */
export function isAppealLimitedMember(user: AppealUser) {
  if (!user || user.type === 'Staff') return false;
  if (user.restriction?.blocked) return false;
  const status = String(user.status || '').toLowerCase();
  const code = user.restriction?.code;
  return Boolean(
    user.restriction?.banned ||
    user.restriction?.locked ||
    code === 'ACCOUNT_BANNED' ||
    code === 'ACCOUNT_LOCKED' ||
    status === 'banned' ||
    status === 'locked'
  );
}
