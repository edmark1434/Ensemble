const { randomUUID } = require('crypto');
const {
  oauthUrl, exchangeOAuthCode, requestMeeting, joinMeeting, leaveMeeting,
  endMeeting, syncMeeting, activeMeeting, connectionStatus, publicMeeting,
} = require('../services/GoogleMeetServices');
const { getGoogleMeeting } = require('../repositories/GoogleMeetRepositories');
const { getInboxByIdRepositories } = require('../repositories/InboxRepositories');
const { createMessageServices } = require('../services/InboxServices');
const { createNotificationServices } = require('../services/NotificationServices');
const { getIo } = require('../lib/WebSocket');

const sendError = (res, error) => res.status(error.statusCode || 500).json({ error: error.message || 'Google Meet integration failed' });
const emitMeeting = (event, meeting) => getIo().to(String(meeting.conversation_id)).emit(event, publicMeeting(meeting) || meeting);

function readableDuration(startedAt, endedAt) {
  const seconds = Math.max(0, Math.floor((new Date(endedAt) - new Date(startedAt)) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  const parts = [];
  if (hours) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  if (!hours && !minutes) parts.push(`${remaining} ${remaining === 1 ? 'second' : 'seconds'}`);
  return parts.join(' ');
}

async function notifyMembers(meeting) {
  const inbox = await getInboxByIdRepositories(String(meeting.conversation_id));
  if (!inbox) return;
  await Promise.all((inbox.members || [])
    .filter((member) => String(member.account_id) !== String(meeting.requested_by_account_id) && !['left', 'removed'].includes(member.status))
    .map(async (member) => {
      const notification = await createNotificationServices({
        account_id: String(member.account_id),
        message: meeting.status === 'scheduled'
          ? `${meeting.requester_name || 'Someone'} scheduled a meeting for ${new Date(meeting.scheduled_at).toLocaleString()}`
          : `${meeting.requester_name || 'Someone'} requested an instant meeting`,
        is_read: false,
        reference_table: 'inbox',
        reference_prefix: 'meeting_request',
        reference_path: `/inbox/direct?conversation=${meeting.conversation_id}`,
        reference_id: randomUUID(),
      }).catch(() => null);
      if (notification) getIo().to(String(member.account_id)).emit('notification', notification);
    }));
}

function connectGoogle(req, res) {
  try { return res.json({ authorization_url: oauthUrl(req.session.account_id) }); }
  catch (error) { return sendError(res, error); }
}

async function status(req, res) {
  try { return res.json(await connectionStatus(req.session.account_id)); }
  catch (error) { return sendError(res, error); }
}

async function oauthCallback(req, res) {
  const target = process.env.GOOGLE_MEET_FRONTEND_REDIRECT_URL || 'http://localhost:5173/inbox/direct';
  try {
    await exchangeOAuthCode(req.query.code, req.query.state);
    const origin = new URL(target).origin;
    return res.type('html').send(`<!doctype html><html><body style="background:#080808;color:white;font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0"><p>Google connected. Creating your meeting...</p><script>if(window.opener){window.opener.postMessage({type:'ensemble:google-meet-connected'},${JSON.stringify(origin)});}</script></body></html>`);
  } catch (error) {
    return res.redirect(`${target}${target.includes('?') ? '&' : '?'}googleMeet=error`);
  }
}

async function createMeeting(req, res) {
  try {
    const meeting = await requestMeeting(req.body.conversation_id, req.session.account_id, {
      mode: req.body.mode,
      scheduledAt: req.body.scheduled_at,
    });
    if (!meeting.was_reused) {
      const message = await createMessageServices({
        conversation_id: meeting.conversation_id,
        message_content: `[meeting:requested:${meeting._id}] ${meeting.requester_name || 'Someone'} ${meeting.status === 'scheduled' ? `scheduled a meeting for ${new Date(meeting.scheduled_at).toLocaleString()}` : 'requested an instant meeting'}`,
      }, req.session.account_id, { suppressNotifications: true }).catch(() => null);
      if (message) getIo().to(String(meeting.conversation_id)).emit('newMessage', message);
      await notifyMembers(meeting);
    }
    emitMeeting('googleMeetingRequested', meeting);
    return res.status(201).json(publicMeeting(meeting));
  } catch (error) { return sendError(res, error); }
}

async function join(req, res) {
  try {
    const meeting = await joinMeeting(req.params.meetingId, req.session.account_id);
    getIo().to(String(meeting.conversation_id)).emit('googleMeetingUpdated', meeting);
    return res.json(meeting);
  } catch (error) { return sendError(res, error); }
}

async function leave(req, res) {
  try {
    const meeting = await leaveMeeting(req.params.meetingId, req.session.account_id);
    getIo().to(String(meeting.conversation_id)).emit('googleMeetingUpdated', meeting);
    return res.json(meeting);
  } catch (error) { return sendError(res, error); }
}

async function finalizeEnd(meetingId, accountId, syncOnly = false) {
  const stored = await getGoogleMeeting(meetingId);
  const meeting = syncOnly ? await syncMeeting(meetingId, accountId) : await endMeeting(meetingId, accountId);
  if (meeting.status !== 'ended' || meeting.was_already_ended) return meeting;
  getIo().to(String(meeting.conversation_id)).emit('googleMeetingEnded', meeting);
  const duration = readableDuration(stored?.started_at || meeting.started_at, meeting.ended_at || new Date());
  const message = await createMessageServices({
    conversation_id: meeting.conversation_id,
    message_content: `[meeting:ended:${meeting.meeting_id}] Meeting ended · ${duration}`,
  }, accountId, { suppressNotifications: true }).catch(() => null);
  if (message) getIo().to(String(meeting.conversation_id)).emit('newMessage', message);
  return meeting;
}

async function end(req, res) {
  try { return res.json(await finalizeEnd(req.params.meetingId, req.session.account_id)); }
  catch (error) { return sendError(res, error); }
}

async function sync(req, res) {
  try { return res.json(await finalizeEnd(req.params.meetingId, req.session.account_id, true)); }
  catch (error) { return sendError(res, error); }
}

async function active(req, res) {
  try { return res.json(await activeMeeting(req.params.conversationId, req.session.account_id)); }
  catch (error) { return sendError(res, error); }
}

module.exports = { connectGoogle, status, oauthCallback, createMeeting, join, leave, end, sync, active };
