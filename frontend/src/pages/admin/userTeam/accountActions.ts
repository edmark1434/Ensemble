import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';

export async function setAccountStatus(accountId: string, action: string) {
  const res = await api.patch(`/api/admin/accounts/${accountId}/status`, { action });
  if (!res.data?.success) throw new Error(res.data?.message || 'Status update failed');
  showSuccessToast(res.data.message || `Account ${action} applied`);
  return res.data.data;
}

export async function setAccountVerification(accountId: string, action: string) {
  const res = await api.patch(`/api/admin/accounts/${accountId}/verification`, { action });
  if (!res.data?.success) throw new Error(res.data?.message || 'Verification update failed');
  showSuccessToast(res.data.message || 'Verification updated');
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
  payload: { title?: string; reason?: string; points?: number }
) {
  const res = await api.post(`/api/admin/accounts/${accountId}/warn`, payload);
  if (!res.data?.success) throw new Error(res.data?.message || 'Warning failed');
  showSuccessToast(res.data.message || 'Warning issued');
  return res.data.data;
}

export function handleAccountActionError(err: unknown) {
  const message =
    (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
      ?.message ||
    (err as { message?: string })?.message ||
    'Action failed';
  showErrorToast(message);
}
