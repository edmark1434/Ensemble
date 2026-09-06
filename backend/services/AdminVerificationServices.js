const axios = require('axios');
const {
  getUserVerificationRecord,
  updateUserVerificationExpiry,
  prepareUserVerificationApprovalExpiry,
  restoreUserVerificationExpiry,
  markUserVerificationPending,
  applyTeamVerificationAction,
} = require('../repositories/AdminUserTeamRepositories');
const { createNotification } = require('../repositories/NotificationRepositories');
const { getActiveTeamOwnerAccountIds } = require('../repositories/TeamsRepositories');
const { getIo } = require('../lib/WebSocket');
const redisClient = require('../lib/Redis');
const {
  appyForResubmissionServices,
  approvedVerificationServices,
  DeclinedVerificationServices,
} = require('./AccountVerificationServices');

const DECISION_KYC_STATUSES = new Set(['in review', 'approved']);
const DIDIT_DECISION_CACHE_TTL_SECONDS = 60;

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
  const isTeam = String(record?.account_type || '').toLowerCase() === 'team';

  if (isTeam) {
    return {
      activity: record?.verification_id ? 'details' : 'none',
      accountType: 'Team',
      isTeam: true,
      isVerified: Boolean(record?.is_verified),
      verificationStatus: record?.internal_status || 'Pending',
      kycStatus: null,
      verifiedAt: record?.verified_at || null,
      expiresAt: record?.expires_at || null,
      attachments: record?.attachments || [],
      businessDetails: record?.business_type ? {
        businessType: record.business_type,
        registeredBusinessName: record.registered_business_name,
        registrationNumber: record.registration_number,
        registrationCountry: record.registration_country,
        relationshipToBusiness: record.relationship_to_business,
        submittedByAccountId: record.submitted_by_account_id,
        submittedByName: record.submitted_by_name,
        submittedByHandle: record.submitted_by_handle,
        submissionVersion: record.submission_version,
      } : null,
      decision: null,
    };
  }

  if (!record || !record.verification_session_id) {
    return {
      activity: 'none',
      accountType: record?.account_type || null,
      isTeam: false,
      isVerified: Boolean(record?.is_verified),
      verificationStatus: 'No Verification Activity',
      kycStatus: 'No Verification Activity',
      verifiedAt: record?.verified_at || null,
      expiresAt: record?.expires_at || null,
      decision: null,
    };
  }

  const verificationStatus = record.internal_status || 'Pending';
  const kycStatus = record.kyc_status || 'Not Started';
  const base = {
    activity: 'status_only',
    accountType: record.account_type || 'User',
    isTeam: false,
    isVerified: Boolean(record.is_verified),
    verificationStatus,
    kycStatus,
    verificationSessionId: record.verification_session_id,
    verifiedAt: record.verified_at || null,
    expiresAt: record.expires_at || null,
    decision: null,
  };

  if (!DECISION_KYC_STATUSES.has(String(kycStatus).trim().toLowerCase())) return base;
  if (!record.didit_session_id) return { ...base, activity: 'details_unavailable' };
  if (!process.env.DIDIT_API_KEY) {
    console.error('DIDIT_API_KEY is missing while loading admin verification details');
    return { ...base, activity: 'details_unavailable' };
  }

  const decisionCacheKey = `admin-verification-decision:v1:${record.didit_session_id}`;
  try {
    const cached = await redisClient.get(decisionCacheKey);
    if (cached) {
      return { ...base, activity: 'details', decision: JSON.parse(cached) };
    }
  } catch {
    // Redis is an accelerator only; the provider request remains authoritative.
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
    const decision = sanitizeDecision(response.data || {});
    void redisClient.set(decisionCacheKey, JSON.stringify(decision), { EX: DIDIT_DECISION_CACHE_TTL_SECONDS }).catch(() => undefined);
    return {
      ...base,
      activity: 'details',
      decision,
    };
  } catch (error) {
    console.error('Failed to fetch Didit verification decision:', error.response?.status || error.message);
    return { ...base, activity: 'details_unavailable' };
  }
}

function actionError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

async function applyAdminDiditVerificationAction(accountId, action, options = {}) {
  const record = await getUserVerificationRecord(accountId);
  const normalizedAction = String(action || '').toLowerCase();
  const verifiedByAccountId = options.verifiedByAccountId;
  const comment = String(options.comment || '').trim();
  const reverificationRequirements = options.reverificationRequirements || {};
  let validityDays = Number(options.validityDays);
  if (!Number.isFinite(validityDays) || validityDays <= 0) validityDays = 365;
  validityDays = Math.min(Math.max(Math.floor(validityDays), 1), 3650);

  if (String(record?.account_type || '').toLowerCase() === 'team') {
    if (!['approve', 'decline', 'reverify'].includes(normalizedAction)) {
      throw actionError(`Unsupported Team verification action: ${action}`);
    }
    if (!verifiedByAccountId) {
      throw actionError('The reviewing admin account could not be identified');
    }
    if (!comment) {
      throw actionError('A reason is required for this Team verification action');
    }

    const result = await applyTeamVerificationAction(
      accountId,
      normalizedAction,
      validityDays,
      verifiedByAccountId
    );
    const teamName = record.team_name || 'Unnamed team';
    const notificationMessage = `Team verification for "${teamName}" has been ${result.verificationStatus}. Admin message: ${comment}`;
    const verificationPath = record.team_id
      ? `/teams/${encodeURIComponent(record.team_id)}/business-verification`
      : '/teams';
    const ownerAccountIds = await getActiveTeamOwnerAccountIds(accountId);
    const io = getIo();
    await Promise.all(ownerAccountIds.map(async (ownerAccountId) => {
      const notification = await createNotification({
        message: notificationMessage,
        is_read: false,
        reference_table: 'verifications',
        reference_prefix: 'BUSINESS_VERIFICATION',
        reference_path: verificationPath,
        reference_id: result.verification.verification_id,
        account_id: ownerAccountId,
      });
      io.to(String(ownerAccountId)).emit('notification', notification);
      return notification;
    }));

    return {
      action: normalizedAction,
      mode: 'team_local_update',
      verificationStatus: result.verificationStatus,
      kycStatus: null,
      isVerified: Boolean(result.verification.is_verified),
      expiresAt: result.session.expires_at,
      validityDays: normalizedAction === 'approve' ? validityDays : null,
    };
  }

  if (!record?.verification_session_id || !record.didit_session_id) {
    throw actionError('No verification session is linked to this user');
  }

  const kycStatus = String(record.kyc_status || '').toLowerCase();
  const verificationStatus = String(record.internal_status || '').toLowerCase();
  if (normalizedAction === 'approve' && !verifiedByAccountId) {
    throw actionError('The approving admin account could not be identified');
  }

  if (normalizedAction === 'approve') {
    const alreadyApproved = kycStatus === 'approved'
      && ['approved', 'verified'].includes(verificationStatus)
      && Boolean(record.is_verified);

    if (alreadyApproved) {
      const expiry = await updateUserVerificationExpiry(accountId, validityDays, verifiedByAccountId);
      return {
        action: 'approve',
        mode: expiry?.expiry_changed ? 'expiry_updated' : 'no_change',
        verificationStatus: 'Approved',
        kycStatus: 'Approved',
        isVerified: true,
        expiresAt: expiry?.expires_at || record.expires_at || null,
        validityDays,
      };
    }

    if (kycStatus !== 'in review' || record.is_verified) {
      throw actionError('Only an In Review, unverified session can be approved through Didit');
    }
    if (!comment) {
      throw actionError('A reason is required to approve this verification through Didit');
    }

    await prepareUserVerificationApprovalExpiry(accountId, validityDays, verifiedByAccountId);
    try {
      await approvedVerificationServices(record.didit_session_id, accountId, validityDays, comment);
    } catch (error) {
      await restoreUserVerificationExpiry(
        accountId,
        record.expires_at,
        record.verified_by_account_id
      );
      throw error;
    }
    return {
      action: 'approve',
      mode: 'didit_requested',
      verificationStatus: record.internal_status,
      kycStatus: record.kyc_status,
      validityDays,
    };
  }

  if (normalizedAction === 'decline') {
    if (!comment) throw actionError('A reason is required to decline this verification');
    await DeclinedVerificationServices(record.didit_session_id, accountId, comment);
    return { action: 'decline', mode: 'didit_requested' };
  }

  if (normalizedAction === 'reverify') {
    if (!comment) throw actionError('A reason is required to request reverification');
    await appyForResubmissionServices(record.didit_session_id, accountId, comment, reverificationRequirements);
    await redisClient.del(`admin-verification-decision:v1:${record.didit_session_id}`).catch(() => undefined);
    const selectedLabels = [
      reverificationRequirements.idDocument && 'ID document',
      reverificationRequirements.liveness && 'liveness',
      reverificationRequirements.faceMatch && 'face match',
      reverificationRequirements.ipAnalysis && 'IP analysis',
    ].filter(Boolean).join(', ');
    const notification = await createNotification({
      message: `Your identity verification requires resubmission: ${selectedLabels}. Admin message: ${comment}`,
      is_read: false,
      reference_table: 'verification',
      reference_prefix: 'IDENTITY_REVERIFICATION',
      reference_path: '/account-verification-status',
      reference_id: record.verification_id,
      account_id: accountId,
    });
    getIo().to(String(accountId)).emit('notification', notification);
    return { action: 'reverify', mode: 'didit_requested' };
  }

  if (normalizedAction === 'pending') {
    await markUserVerificationPending(accountId);
    return { action: 'pending', mode: 'local_update' };
  }

  throw actionError(`Unsupported verification action: ${action}`);
}

module.exports = { getAdminVerificationDetails, applyAdminDiditVerificationAction };
