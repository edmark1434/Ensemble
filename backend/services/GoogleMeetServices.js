const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { getInboxByIdRepositories } = require('../repositories/InboxRepositories');
const { getAccountById } = require('../repositories/AccountRepositories');
const { getProfileCurrentAvatarByAccountIdService } = require('./ProfileServices');
const {
  upsertGoogleConnection,
  getGoogleConnection,
  deleteGoogleConnection,
  createGoogleMeeting,
  getGoogleMeeting,
  getActiveGoogleMeeting,
  getActiveGoogleMeetings,
  endActiveGoogleMeetings,
  updateGoogleMeeting,
} = require('../repositories/GoogleMeetRepositories');

class GoogleMeetServiceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const GOOGLE_TIMEOUT_MS = 10_000;
const MEET_SCOPE = 'https://www.googleapis.com/auth/meetings.space.created';

function config() {
  const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_MEET_REDIRECT_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new GoogleMeetServiceError(`Missing Google Meet configuration: ${missing.join(', ')}`, 503);
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUrl: process.env.GOOGLE_MEET_REDIRECT_URL,
    stateSecret: process.env.GOOGLE_MEET_STATE_SECRET || process.env.ACCESS_TOKEN_JWT_SECRET,
    encryptionSecret: process.env.GOOGLE_MEET_TOKEN_ENCRYPTION_KEY || process.env.ACCESS_TOKEN_JWT_SECRET,
  };
}

function encryptionKey() {
  const secret = config().encryptionSecret;
  if (!secret) throw new GoogleMeetServiceError('GOOGLE_MEET_TOKEN_ENCRYPTION_KEY is required', 503);
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

function decrypt(value) {
  const [iv, tag, ciphertext] = String(value).split('.').map((part) => Buffer.from(part, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

async function requireMember(conversationId, accountId) {
  const inbox = await getInboxByIdRepositories(String(conversationId));
  if (!inbox) throw new GoogleMeetServiceError('Conversation not found', 404);
  const member = (inbox.members || []).find(
    (item) => String(item.account_id) === String(accountId) && !['left', 'removed'].includes(item.status)
  );
  if (!member) throw new GoogleMeetServiceError('You are not a member of this conversation', 403);
  return inbox;
}

function oauthUrl(accountId) {
  const settings = config();
  if (!settings.stateSecret) throw new GoogleMeetServiceError('GOOGLE_MEET_STATE_SECRET is required', 503);
  const state = jwt.sign({ accountId: String(accountId), purpose: 'google-meet-oauth' }, settings.stateSecret, { expiresIn: '10m' });
  const params = new URLSearchParams({
    client_id: settings.clientId,
    redirect_uri: settings.redirectUrl,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: MEET_SCOPE,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function exchangeOAuthCode(code, state) {
  const settings = config();
  let payload;
  try { payload = jwt.verify(state, settings.stateSecret); } catch { throw new GoogleMeetServiceError('Invalid or expired Google OAuth state', 401); }
  if (payload.purpose !== 'google-meet-oauth') throw new GoogleMeetServiceError('Invalid Google OAuth state', 401);
  const response = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
    code,
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    redirect_uri: settings.redirectUrl,
    grant_type: 'authorization_code',
  }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: GOOGLE_TIMEOUT_MS });
  const token = response.data;
  await upsertGoogleConnection(payload.accountId, {
    access_token: encrypt(token.access_token),
    refresh_token: token.refresh_token ? encrypt(token.refresh_token) : null,
    expires_at: new Date(Date.now() + Number(token.expires_in || 3600) * 1000),
    scope: token.scope || MEET_SCOPE,
  });
  return payload.accountId;
}

async function accessToken(accountId) {
  const connection = await getGoogleConnection(accountId);
  if (!connection) throw new GoogleMeetServiceError('Connect your Google account before requesting a meeting', 409);
  try {
    if (new Date(connection.expires_at).getTime() > Date.now() + 60_000) return decrypt(connection.access_token);
    if (!connection.refresh_token) throw new Error('Missing refresh token');
    const settings = config();
    const response = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      refresh_token: decrypt(connection.refresh_token),
      grant_type: 'refresh_token',
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: GOOGLE_TIMEOUT_MS });
    await upsertGoogleConnection(accountId, {
      ...connection,
      access_token: encrypt(response.data.access_token),
      expires_at: new Date(Date.now() + Number(response.data.expires_in || 3600) * 1000),
    });
    return response.data.access_token;
  } catch (error) {
    await deleteGoogleConnection(accountId).catch(() => undefined);
    throw new GoogleMeetServiceError('Reconnect your Google account to create a meeting', 409);
  }
}

async function googleRequest(accountId, request) {
  try {
    return await axios({
      baseURL: 'https://meet.googleapis.com/v2',
      timeout: GOOGLE_TIMEOUT_MS,
      ...request,
      headers: { ...request.headers, Authorization: `Bearer ${await accessToken(accountId)}` },
    });
  } catch (error) {
    if (error instanceof GoogleMeetServiceError) throw error;
    const message = error.response?.data?.error?.message || error.message || 'Google Meet request failed';
    throw new GoogleMeetServiceError(message, error.response?.status || 502);
  }
}

async function accountIdentity(accountId) {
  const [account, avatar] = await Promise.all([
    getAccountById(accountId).catch(() => null),
    getProfileCurrentAvatarByAccountIdService(accountId).catch(() => null),
  ]);
  return { name: account?.display_name || account?.handle || 'Someone', avatar: avatar?.path || null };
}

function publicMeeting(meeting) {
  if (!meeting) return null;
  return {
    meeting_id: String(meeting.meeting_id || meeting._id),
    conversation_id: meeting.conversation_id,
    requested_by_account_id: meeting.requested_by_account_id,
    requester_name: meeting.requester_name || null,
    requester_avatar: meeting.requester_avatar || null,
    provider: 'google-meet',
    status: meeting.status,
    participant_ids: meeting.participant_ids || [],
    started_at: meeting.started_at,
    scheduled_at: meeting.scheduled_at || null,
    ended_at: meeting.ended_at || null,
  };
}

async function requestMeeting(conversationId, accountId, options = {}) {
  const inbox = await requireMember(conversationId, accountId);
  const mode = options.mode === 'scheduled' ? 'scheduled' : 'instant';
  const scheduledAt = mode === 'scheduled' ? new Date(options.scheduledAt) : null;
  if (mode === 'scheduled' && (!Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now())) {
    throw new GoogleMeetServiceError('Choose a scheduled meeting time in the future');
  }
  const existing = await getActiveGoogleMeeting(conversationId);
  if (existing) {
    if (String(existing.requested_by_account_id) === String(accountId)) return { ...existing, was_reused: true };
    throw new GoogleMeetServiceError('This conversation already has an active meeting', 409);
  }
  const response = await googleRequest(accountId, { method: 'post', url: '/spaces', data: {} });
  const identity = await accountIdentity(accountId);
  return createGoogleMeeting({
    conversation_id: String(conversationId),
    requested_by_account_id: String(accountId),
    requester_name: identity.name,
    requester_avatar: identity.avatar,
    provider: 'google-meet',
    google_space_name: response.data.name,
    meeting_uri: response.data.meetingUri,
    meeting_code: response.data.meetingCode || null,
    status: mode === 'scheduled' ? 'scheduled' : 'requested',
    scheduled_at: scheduledAt,
    participant_ids: [],
    started_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    conversation_name: inbox.conversation_name || null,
  });
}

async function joinMeeting(meetingId, accountId) {
  const meeting = await getGoogleMeeting(meetingId);
  if (!meeting || !['scheduled', 'requested', 'active'].includes(meeting.status)) throw new GoogleMeetServiceError('This meeting is no longer active', 409);
  await requireMember(meeting.conversation_id, accountId);
  const participantIds = Array.from(new Set([...(meeting.participant_ids || []), String(accountId)]));
  const updated = await updateGoogleMeeting(meetingId, {
    participant_ids: participantIds,
    status: 'active',
    conference_started_at: meeting.conference_started_at || new Date(),
  });
  return { ...publicMeeting(updated), meeting_url: meeting.meeting_uri };
}

async function leaveMeeting(meetingId, accountId) {
  const meeting = await getGoogleMeeting(meetingId);
  if (!meeting) throw new GoogleMeetServiceError('Meeting not found', 404);
  await requireMember(meeting.conversation_id, accountId);
  const participantIds = (meeting.participant_ids || []).filter((id) => String(id) !== String(accountId));
  return publicMeeting(await updateGoogleMeeting(meetingId, { participant_ids: participantIds }));
}

async function endMeeting(meetingId, accountId, options = {}) {
  const meeting = await getGoogleMeeting(meetingId);
  if (!meeting) throw new GoogleMeetServiceError('Meeting not found', 404);
  await requireMember(meeting.conversation_id, accountId);
  if (!options.synced && String(meeting.requested_by_account_id) !== String(accountId)) {
    throw new GoogleMeetServiceError('Only the meeting organizer can end it for everyone', 403);
  }
  if (meeting.status === 'ended') return { ...publicMeeting(meeting), was_already_ended: true };
  let providerEndError = null;
  if (!options.synced) {
    const activeMeetings = await getActiveGoogleMeetings(meeting.conversation_id);
    for (const active of activeMeetings) {
      if (!active.google_space_name) continue;
      try {
        await googleRequest(active.requested_by_account_id, {
          method: 'post', url: `/${active.google_space_name}:endActiveConference`, data: {},
        });
      } catch (error) {
        providerEndError ||= error.message;
        console.error('Google Meet endActiveConference failed:', error.message);
      }
    }
  }
  const endedAt = new Date();
  const ended = await endActiveGoogleMeetings(meeting.conversation_id, endedAt);
  return { ...publicMeeting(ended || { ...meeting, status: 'ended', ended_at: endedAt }), provider_end_error: providerEndError };
}

async function syncMeeting(meetingId, accountId) {
  const meeting = await getGoogleMeeting(meetingId);
  if (!meeting) throw new GoogleMeetServiceError('Meeting not found', 404);
  await requireMember(meeting.conversation_id, accountId);
  if (meeting.status === 'ended' || !meeting.conference_started_at) return publicMeeting(meeting);
  try {
    const response = await googleRequest(meeting.requested_by_account_id, { method: 'get', url: `/${meeting.google_space_name}` });
    if (response.data.activeConference && !meeting.google_conference_seen) {
      return publicMeeting(await updateGoogleMeeting(meetingId, { google_conference_seen: true }));
    }
    if (!response.data.activeConference && meeting.google_conference_seen) {
      return endMeeting(meetingId, meeting.requested_by_account_id, { synced: true });
    }
  } catch (error) {
    if (error.statusCode !== 404) throw error;
    if (meeting.google_conference_seen) return endMeeting(meetingId, meeting.requested_by_account_id, { synced: true });
  }
  return publicMeeting(meeting);
}

async function activeMeeting(conversationId, accountId) {
  await requireMember(conversationId, accountId);
  return publicMeeting(await getActiveGoogleMeeting(conversationId));
}

async function connectionStatus(accountId) {
  const connection = await getGoogleConnection(accountId);
  return { connected: Boolean(connection?.refresh_token || connection?.access_token) };
}

module.exports = {
  GoogleMeetServiceError, oauthUrl, exchangeOAuthCode, requestMeeting, joinMeeting,
  leaveMeeting, endMeeting, syncMeeting, activeMeeting, connectionStatus, publicMeeting,
};
