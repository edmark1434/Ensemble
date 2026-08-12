const { lazyCollection } = require('../lib/MongoDb');
const { ObjectId } = require('mongodb');

const GoogleConnections = lazyCollection('google_meet_connections');
const GoogleMeetings = lazyCollection('google_meetings');

async function upsertGoogleConnection(accountId, connection) {
  const { _id, account_id, created_at, ...mutable } = connection;
  return GoogleConnections.findOneAndUpdate(
    { account_id: String(accountId) },
    {
      $set: { ...mutable, account_id: String(accountId), updated_at: new Date() },
      $setOnInsert: { created_at: new Date() },
    },
    { upsert: true, returnDocument: 'after' }
  );
}

const getGoogleConnection = (accountId) => GoogleConnections.findOne({ account_id: String(accountId) });
const deleteGoogleConnection = (accountId) => GoogleConnections.deleteOne({ account_id: String(accountId) });

async function createGoogleMeeting(meeting) {
  const result = await GoogleMeetings.insertOne(meeting);
  return GoogleMeetings.findOne({ _id: result.insertedId });
}

function getGoogleMeeting(meetingId) {
  if (!ObjectId.isValid(String(meetingId))) return null;
  return GoogleMeetings.findOne({ _id: new ObjectId(String(meetingId)) });
}

function getActiveGoogleMeeting(conversationId) {
  return GoogleMeetings.findOne({
    conversation_id: String(conversationId),
    status: { $in: ['scheduled', 'requested', 'active'] },
  }, { sort: { created_at: -1 } });
}

function getActiveGoogleMeetings(conversationId) {
  return GoogleMeetings.find({
    conversation_id: String(conversationId),
    status: { $in: ['scheduled', 'requested', 'active'] },
  }).sort({ created_at: -1 }).toArray();
}

async function endActiveGoogleMeetings(conversationId, endedAt = new Date()) {
  await GoogleMeetings.updateMany(
    {
      conversation_id: String(conversationId),
      status: { $in: ['scheduled', 'requested', 'active'] },
    },
    { $set: { status: 'ended', participant_ids: [], ended_at: endedAt, updated_at: endedAt } }
  );
  return GoogleMeetings.findOne({ conversation_id: String(conversationId) }, { sort: { ended_at: -1 } });
}

function updateGoogleMeeting(meetingId, updates) {
  if (!ObjectId.isValid(String(meetingId))) return null;
  return GoogleMeetings.findOneAndUpdate(
    { _id: new ObjectId(String(meetingId)) },
    { $set: { ...updates, updated_at: new Date() } },
    { returnDocument: 'after' }
  );
}

module.exports = {
  upsertGoogleConnection,
  getGoogleConnection,
  deleteGoogleConnection,
  createGoogleMeeting,
  getGoogleMeeting,
  getActiveGoogleMeeting,
  getActiveGoogleMeetings,
  endActiveGoogleMeetings,
  updateGoogleMeeting,
};
