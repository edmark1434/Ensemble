import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';

type ActionOptions = { silent?: boolean };

export async function setAccountStatus(accountId: string, action: string, options?: ActionOptions) {
  const res = await api.patch(`/api/admin/accounts/${accountId}/status`, { action });
  if (!res.data?.success) throw new Error(res.data?.message || 'Status update failed');
  if (!options?.silent) {
    showSuccessToast(res.data.message || `Account ${action} applied`);
  }
  return res.data.data;
}

export async function setAccountVerification(
  accountId: string,
  action: string,
  options?: ActionOptions
) {
  const res = await api.patch(`/api/admin/accounts/${accountId}/verification`, { action });
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

export async function freezeAccountCredits(accountId: string, freeze = true) {
  const res = await api.post(`/api/admin/accounts/${accountId}/credits/freeze`, { freeze });
  if (!res.data?.success) throw new Error(res.data?.message || 'Credit freeze failed');
  showSuccessToast(res.data.message || (freeze ? 'Credits frozen' : 'Credits unfrozen'));
  return res.data.data;
}

export async function warnAccount(
  accountId: string,
  payload: { title?: string; reason?: string; points?: number },
  options?: ActionOptions
) {
  const res = await api.post(`/api/admin/accounts/${accountId}/warn`, payload);
  if (!res.data?.success) throw new Error(res.data?.message || 'Warning failed');
  if (!options?.silent) {
    showSuccessToast(res.data.message || 'Warning issued');
  }
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
  action: string
) {
  let ok = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const accountId of accountIds) {
    try {
      if (kind === 'status') {
        await setAccountStatus(accountId, action, { silent: true });
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
