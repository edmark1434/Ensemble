import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';

type ActionOptions = {
  silent?: boolean;
  days?: number | null;
  duration?: 'temporary' | 'permanent';
  endsAt?: string | null;
  reason?: string;
  punishmentId?: string;
  customDuration?: boolean;
  /** Team targets (older flag): also apply the penalty to (or lift it from) the team leader. */
  includeLeader?: boolean;
  /** Team targets: who else gets it, or has a team-linked penalty lifted. */
  memberScope?: 'none' | 'leader' | 'selected' | 'all';
  /** With `memberScope: 'selected'`: the chosen active members. */
  memberAccountIds?: string[];
};

export async function setAccountStatus(accountId: string, action: string, options?: ActionOptions) {
  const res = await api.patch(`/api/admin/accounts/${accountId}/status`, {
    action,
    days: options?.days,
    duration: options?.duration,
    endsAt: options?.endsAt,
    reason: options?.reason,
    punishmentId: options?.punishmentId,
    customDuration: options?.customDuration,
    includeLeader: options?.includeLeader,
    memberScope: options?.memberScope,
    memberAccountIds: options?.memberAccountIds,
  });
  if (!res.data?.success) throw new Error(res.data?.message || 'Status update failed');
  if (!options?.silent) {
    showSuccessToast(res.data.message || `Account ${action} applied`);
  }
  return res.data.data;
}

export async function setAccountVerification(
  accountId: string,
  action: string,
  options?: ActionOptions & { validityDays?: number; diditWorkflow?: boolean; comment?: string; reverificationRequirements?: { idDocument: boolean; liveness: boolean; faceMatch: boolean; ipAnalysis: boolean } }
) {
  const diditPath: Record<string, string> = {
    approve: 'approve',
    decline: 'decline',
    reverify: 'resubmit',
  };
  const suffix = options?.diditWorkflow ? diditPath[action] : undefined;
  const endpoint = suffix
    ? `/api/admin/accounts/${accountId}/verification/${suffix}`
    : `/api/admin/accounts/${accountId}/verification`;
  const res = await api.patch(endpoint, {
    action,
    validityDays: options?.validityDays,
    comment: options?.comment,
    reverificationRequirements: options?.reverificationRequirements,
  });
  if (!res.data?.success) throw new Error(res.data?.message || 'Verification update failed');
  if (!options?.silent) {
    showSuccessToast(res.data.message || 'Verification updated');
  }
  return res.data.data;
}

export async function adjustAccountCredits(accountId: string, amount: number, note?: string) {
  const res = await api.post(`/api/admin/accounts/${accountId}/credits/adjust`, { amount, note });
  if (!res.data?.success) throw new Error(res.data?.message || 'Credit adjustment failed');
  showSuccessToast(res.data.message || 'Credits adjusted');
  return res.data.data;
}

export type CreditHoldInput = {
  /** Shown to the member. Required to freeze. */
  reason?: string;
  /** Credits to hold. Omit to hold every spendable credit. */
  amount?: number | null;
  /** Hold length in days (1–365). Omit for "until staff review". */
  days?: number | null;
  /** Exact release date and time (ISO). Takes precedence over `days`. */
  endsAt?: string | null;
};

export async function freezeAccountCredits(
  accountId: string,
  freeze = true,
  options?: ActionOptions,
  hold?: CreditHoldInput
) {
  const res = await api.post(`/api/admin/accounts/${accountId}/credits/freeze`, {
    freeze,
    reason: hold?.reason,
    amount: hold?.amount ?? undefined,
    days: hold?.endsAt ? undefined : hold?.days ?? undefined,
    endsAt: hold?.endsAt ?? undefined,
  });
  if (!res.data?.success) throw new Error(res.data?.message || 'Credit freeze failed');
  if (!options?.silent) {
    showSuccessToast(res.data.message || (freeze ? 'Credits frozen' : 'Credits unfrozen'));
  }
  return res.data.data;
}

export async function warnAccount(
  accountId: string,
  payload: { warningId?: string; type?: string; reason?: string; points?: number; expiresAt?: string; endsAt?: string | null; duration?: 'temporary' | 'permanent'; days?: number | null },
  options?: ActionOptions
) {
  const res = await api.post(`/api/admin/accounts/${accountId}/warn`, payload);
  if (!res.data?.success) throw new Error(res.data?.message || 'Warning failed');
  if (!options?.silent) {
    showSuccessToast(res.data.message || 'Warning issued');
  }
  return res.data.data;
}

export async function rescindWarning(accountId: string, violationId: string) {
  const res = await api.post(`/api/admin/accounts/${accountId}/warnings/${violationId}/rescind`);
  if (!res.data?.success) throw new Error(res.data?.message || 'Could not rescind the warning');
  showSuccessToast(res.data.message || 'Warning rescinded');
  return res.data.data;
}

export type WarningLiftOption = {
  id: string;
  kind: 'level' | 'full';
  label: string;
  /** Threshold rows this lift takes the member back above (they can start again on a new drop). */
  clears: string[];
  liftPoints: number;
  targetMerit: number;
};

/** One row of the automatic punishment ladder, as the desks show it. */
export type PunishmentLadderRow = {
  minPoints: number;
  triggerMerit: number;
  effect: string;
  effectLabel: string;
  label: string;
  durationDays: number;
};

/** An automatic merit punishment (running or past). */
export type MeritPenaltyRow = {
  id: string;
  effect: string;
  label: string;
  ruleLabel?: string | null;
  violationNumber?: string | null;
  triggerMerit: number;
  meritAtStart: number;
  durationDays: number;
  startsAt: string;
  endsAt: string;
  endedAt?: string | null;
  endReason?: string | null;
  endNote?: string | null;
};

export type WarningLiftPreview = {
  accountId: string;
  points: number;
  merit: number;
  /** Automatic punishments running now. A lift does not end them. */
  punishments: MeritPenaltyRow[];
  options: WarningLiftOption[];
  ladder: PunishmentLadderRow[];
};

export type WarningLiftInput = {
  /** Points to lift. Send this or `targetMerit`. */
  points?: number;
  /** Platform Merit to restore the member to. */
  targetMerit?: number;
  /** Lift only from this warning (violation id or number). */
  violationId?: string | null;
  /** Staff-only note; the member does not see it. */
  reason: string;
};

export async function getWarningLiftPreview(accountId: string): Promise<WarningLiftPreview> {
  const res = await api.get(`/api/admin/accounts/${accountId}/warnings/lift-preview`);
  if (!res.data?.success) throw new Error(res.data?.message || 'Could not load warning points');
  return res.data.data;
}

export async function liftWarningPoints(accountId: string, input: WarningLiftInput) {
  const res = await api.post(`/api/admin/accounts/${accountId}/warnings/lift`, input);
  if (!res.data?.success) throw new Error(res.data?.message || 'Could not lift warning points');
  showSuccessToast(res.data.message || 'Warning points lifted');
  return res.data.data;
}

export type AccountMeritPenalties = {
  /** False before the timed-punishment migration has run. */
  ready: boolean;
  active: MeritPenaltyRow[];
  history: MeritPenaltyRow[];
};

export async function getAccountMeritPenalties(accountId: string): Promise<AccountMeritPenalties> {
  const res = await api.get(`/api/admin/accounts/${accountId}/merit-penalties`);
  if (!res.data?.success) throw new Error(res.data?.message || 'Could not load automatic punishments');
  return res.data.data;
}

/** Admin / Support: end one automatic punishment before its clock runs out. */
export async function endMeritPenaltyEarly(accountId: string, penaltyId: string, reason: string) {
  const res = await api.post(`/api/admin/accounts/${accountId}/merit-penalties/${penaltyId}/end`, { reason });
  if (!res.data?.success) throw new Error(res.data?.message || 'Could not end the punishment');
  showSuccessToast(res.data.message || 'Automatic punishment ended');
  return res.data.data;
}

/**
 * Unfreeze (Admin / Support): end running automatic punishments now. With no ids, every
 * running band and mute ends; suspensions end with Unsuspend instead.
 */
export async function unfreezeAccount(accountId: string, input: { reason: string; penaltyIds?: string[] | null }) {
  const res = await api.post(`/api/admin/accounts/${accountId}/merit-penalties/end`, input);
  if (!res.data?.success) throw new Error(res.data?.message || 'Could not end the automatic punishments');
  showSuccessToast(res.data.message || 'Automatic punishments ended');
  return res.data.data;
}

export type TeamOwnershipTransferInput = {
  newOwnerAccountId: string;
  /** What the current owner becomes: a team Admin, a Member, or removed from the team. */
  previousOwnerRole: 'Admin' | 'Member' | 'Removed';
  /** Staff note, also shown to both owners. */
  reason: string;
};

/** Admin / Support: move a team's ownership (e.g. the leader is banned or gone). */
export async function transferTeamOwnership(teamAccountId: string, input: TeamOwnershipTransferInput) {
  const res = await api.post(`/api/admin/teams/${teamAccountId}/transfer-ownership`, input);
  if (!res.data?.success) throw new Error(res.data?.message || 'Could not transfer ownership');
  showSuccessToast(res.data.message || 'Ownership transferred');
  return res.data.data;
}

export async function pardonAccount(accountId: string, note?: string) {
  const res = await api.post(`/api/admin/accounts/${accountId}/pardon`, { note });
  if (!res.data?.success) throw new Error(res.data?.message || 'Pardon failed');
  showSuccessToast(res.data.message || 'Pardon issued');
  return res.data.data;
}

export async function runBulkAccountAction(
  accountIds: string[],
  kind: 'status' | 'verification',
  action: string,
  reason?: string,
  extra?: { memberScope?: 'none' | 'leader' | 'all' }
) {
  let ok = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const accountId of accountIds) {
    try {
      if (kind === 'status') {
        await setAccountStatus(accountId, action, { silent: true, reason, memberScope: extra?.memberScope });
      } else {
        await setAccountVerification(accountId, action, { silent: true });
      }
      ok += 1;
    } catch (err) {
      failed += 1;
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as { message?: string })?.message ||
        'Failed';
      errors.push(message);
    }
  }

  if (ok > 0 && failed === 0) {
    showSuccessToast(`Applied “${action}” to ${ok} account${ok === 1 ? '' : 's'}`);
  } else if (ok > 0 && failed > 0) {
    showSuccessToast(`Updated ${ok}, failed ${failed}`);
    showErrorToast(errors[0] || 'Some accounts could not be updated');
  } else {
    showErrorToast(errors[0] || 'Bulk action failed');
  }

  return { ok, failed };
}

export function handleAccountActionError(err: unknown) {
  const message =
    (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
      ?.message ||
    (err as { message?: string })?.message ||
    'Action failed';
  showErrorToast(message);
}
