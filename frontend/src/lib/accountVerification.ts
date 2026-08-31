import toast from 'react-hot-toast';
import api from '@/lib/axios';

export const ACCOUNT_VERIFICATION_REQUIRED = 'ACCOUNT_VERIFICATION_REQUIRED';

const VERIFICATION_REQUIRED_MESSAGE =
  'Verify your account before posting jobs, posting gigs, or submitting proposals.';

type VerificationRequiredError = Error & { code: string };
type ApiError = {
  message?: string;
  response?: { data?: { message?: string; code?: string } };
};

export async function requireVerifiedAccount(): Promise<void> {
  const response = await api.get('/api/verification/status');
  if (response.data?.data?.is_verified === true) return;

  const error = new Error(VERIFICATION_REQUIRED_MESSAGE) as VerificationRequiredError;
  error.code = ACCOUNT_VERIFICATION_REQUIRED;
  throw error;
}

export function isAccountVerificationRequired(error: unknown): boolean {
  const candidate = error as ApiError & { code?: string };
  return (
    candidate?.code === ACCOUNT_VERIFICATION_REQUIRED ||
    candidate?.response?.data?.code === ACCOUNT_VERIFICATION_REQUIRED
  );
}

export function getVerificationErrorMessage(error: unknown): string {
  const candidate = error as ApiError;
  return candidate?.response?.data?.message || candidate?.message || VERIFICATION_REQUIRED_MESSAGE;
}

export async function continueIfAccountVerified(action: () => void): Promise<boolean> {
  try {
    await requireVerifiedAccount();
    action();
    return true;
  } catch (error) {
    toast.error(getVerificationErrorMessage(error));
    return false;
  }
}