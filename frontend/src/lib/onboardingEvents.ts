export const ONBOARDING_COMPLETED_EVENT = 'ensemble:onboarding-completed';
export const ONBOARDING_STEP_CHANGED_EVENT = 'ensemble:onboarding-step-changed';

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
export function notifyOnboardingStepChanged(path: string, accountId?: string | null) {
  window.dispatchEvent(new CustomEvent(ONBOARDING_STEP_CHANGED_EVENT, {
    detail: {
      accountId: accountId ? String(accountId) : null,
      path,
    },
  }));
}
