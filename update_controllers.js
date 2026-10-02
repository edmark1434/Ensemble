const fs = require('fs');
let content = fs.readFileSync('backend/controllers/GoogleMeetControllers.js', 'utf8');

// Add imports
content = content.replace("const { getInboxByIdRepositories } = require('../repositories/InboxRepositories');", "const { getInboxByIdRepositories, createMessageRepositories, getMessageByIdRepositories } = require('../repositories/InboxRepositories');\nconst { getAccountById } = require('../repositories/AccountRepositories');");

// Add join message
content = content.replace(`async function join(req, res) {
    try {
      const meeting = await joinMeeting(req.params.meetingId, req.session.account_id);
      getIo().to(String(meeting.conversation_id)).emit('googleMeetingUpdated', meeting);
      return res.json(meeting);
    } catch (error) { return sendError(res, error); }
  }`, `async function join(req, res) {
    try {
      const meeting = await joinMeeting(req.params.meetingId, req.session.account_id);
      getIo().to(String(meeting.conversation_id)).emit('googleMeetingUpdated', meeting);
      
      try {
        const account = await getAccountById(req.session.account_id);
        const name = account?.display_name || account?.handle || 'Someone';
        const insertedId = await createMessageRepositories({
            conversation_id: String(meeting.conversation_id),
            sender_id: String(req.session.account_id),
            message_type: 'system',
            message_content: \`\${name} joined the meeting.\`,
            message_id_reply: null,
            attachments: [],
            links: [],
            message_react: [],
            is_deleted: false,
            is_unsent: false,
            deleted_at: null,
            read_by: [],
            created_at: new Date(),
            updated_at: new Date(),
        });
        const msg = await getMessageByIdRepositories(insertedId);
        if (msg) getIo().to(String(meeting.conversation_id)).emit('newMessage', msg);
      } catch (err) {}

      return res.json(meeting);
    } catch (error) { return sendError(res, error); }
  }`);

// Add leave message
content = content.replace(`async function leave(req, res) {
    try {
      const meeting = await leaveMeeting(req.params.meetingId, req.session.account_id);
      getIo().to(String(meeting.conversation_id)).emit('googleMeetingUpdated', meeting);
      return res.json(meeting);
    } catch (error) { return sendError(res, error); }
  }`, `async function leave(req, res) {
    try {
      const meeting = await leaveMeeting(req.params.meetingId, req.session.account_id);
      getIo().to(String(meeting.conversation_id)).emit('googleMeetingUpdated', meeting);

      try {
        const account = await getAccountById(req.session.account_id);
        const name = account?.display_name || account?.handle || 'Someone';
        const insertedId = await createMessageRepositories({
            conversation_id: String(meeting.conversation_id),
            sender_id: String(req.session.account_id),
            message_type: 'system',
            message_content: \`\${name} left the meeting.\`,
            message_id_reply: null,
            attachments: [],
            links: [],
            message_react: [],
            is_deleted: false,
            is_unsent: false,
            deleted_at: null,
            read_by: [],
            created_at: new Date(),
            updated_at: new Date(),
        });
        const msg = await getMessageByIdRepositories(insertedId);
        if (msg) getIo().to(String(meeting.conversation_id)).emit('newMessage', msg);
      } catch (err) {}

      return res.json(meeting);
    } catch (error) { return sendError(res, error); }
  }`);

fs.writeFileSync('backend/controllers/GoogleMeetControllers.js', content);
