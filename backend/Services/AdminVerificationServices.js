const axios = require('axios');
const {
  getUserVerificationRecord,
} = require('../Repositories/AdminUserTeamRepositories');

const DECISION_KYC_STATUSES = new Set(['in review', 'approved']);

function first(items) {
  return Array.isArray(items) ? items[0] || null : null;
}

function sanitizeDecision(decision) {
  const id = first(decision.id_verifications);
  const liveness = first(decision.liveness_checks);
  const face = first(decision.face_matches);
  const ip = first(decision.ip_analyses);

  return {
    status: decision.status || null,
    idVerification: id ? {
      status: id.status || null,
      documentType: id.document_type || null,
      frontImage: id.front_image || id.full_front_image || null,
      backImage: id.back_image || id.full_back_image || null,
      portraitImage: id.portrait_image || null,
    } : null,
    liveness: liveness ? {
      status: liveness.status || null,
      score: liveness.score ?? null,
      referenceImage: liveness.reference_image || null,
      videoUrl: liveness.video_url || null,
    } : null,
    faceMatch: face ? {
      status: face.status || null,
      score: face.score ?? null,
      sourceImage: face.source_image || null,
      targetImage: face.target_image || null,
    } : null,
    ipAnalysis: ip ? {
      status: ip.status || null,
      ipAddress: ip.ip_address || null,
      country: ip.ip_country || null,
      region: ip.ip_state || null,
      city: ip.ip_city || null,
      deviceBrand: ip.device_brand || null,
      deviceModel: ip.device_model || null,
      browser: ip.browser_family || null,
      operatingSystem: ip.os_family || null,
      platform: ip.platform || null,
      isVpnOrTor: Boolean(ip.is_vpn_or_tor),
      isDataCenter: Boolean(ip.is_data_center),
    } : null,
  };
}

async function getAdminVerificationDetails(accountId) {
  const record = await getUserVerificationRecord(accountId);
  if (!record || !record.verification_session_id) {
    return {
      activity: 'none',
      isVerified: Boolean(record?.is_verified),
      verificationStatus: 'No Verification Activity',
      kycStatus: 'No Verification Activity',
      decision: null,
    };
  }

  const verificationStatus = record.internal_status || 'Pending';
  const kycStatus = record.kyc_status || 'Not Started';
  const base = {
    activity: 'status_only',
    isVerified: Boolean(record.is_verified),
    verificationStatus,
    kycStatus,
    verificationSessionId: record.verification_session_id,
    decision: null,
  };

  if (!DECISION_KYC_STATUSES.has(String(kycStatus).trim().toLowerCase())) return base;
  if (!record.didit_session_id) return { ...base, activity: 'details_unavailable' };
  if (!process.env.DIDIT_API_KEY) {
    console.error('DIDIT_API_KEY is missing while loading admin verification details');
    return { ...base, activity: 'details_unavailable' };
  }

  try {
    const response = await axios.get(
      `https://verification.didit.me/v3/session/${encodeURIComponent(record.didit_session_id)}/decision/`,
      {
        headers: {
          'x-api-key': process.env.DIDIT_API_KEY,
          Accept: 'application/json',
        },
        timeout: 15000,
      }
    );
    return {
      ...base,
      activity: 'details',
      decision: sanitizeDecision(response.data || {}),
    };
  } catch (error) {
    console.error('Failed to fetch Didit verification decision:', error.response?.status || error.message);
    return { ...base, activity: 'details_unavailable' };
  }
}

module.exports = { getAdminVerificationDetails };
