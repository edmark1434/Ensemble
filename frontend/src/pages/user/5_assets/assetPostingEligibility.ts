import api from '@/lib/axios';

export interface AssetPostingEligibility {
  allowed: boolean;
  code: string | null;
  isVerified: boolean;
  unlimited: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  message: string | null;
}

export async function getAssetPostingEligibility(): Promise<AssetPostingEligibility> {
  const response = await api.get<{ eligibility: AssetPostingEligibility }>(
    '/api/assets/posting-eligibility'
  );
  return response.data.eligibility;
}