export const ONBOARDING_COMPLETED_EVENT = 'ensemble:onboarding-completed';

const completedAccountIds = new Set<string>();

export function wasOnboardingCompleted(accountId?: string | null) {
  return Boolean(accountId && completedAccountIds.has(String(accountId)));
}

export function notifyOnboardingCompleted(accountId?: string | null) {
  if (accountId) completedAccountIds.add(String(accountId));
  window.dispatchEvent(new CustomEvent(ONBOARDING_COMPLETED_EVENT, {
    detail: { accountId: accountId ? String(accountId) : null },
  }));
}
