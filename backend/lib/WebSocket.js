// websocket.js
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const { createCorsOriginValidator, getAllowedOrigins } = require('./CorsOrigins');

dotenv.config();

let io;
const onlineAccounts = new Map();
const callExpiryTimers = new Map();

function addOnlineSocket(accountId, socketId) {
  const accountSockets = onlineAccounts.get(accountId) || new Set();
  const wasOffline = accountSockets.size === 0;
  accountSockets.add(socketId);
  onlineAccounts.set(accountId, accountSockets);
  return wasOffline;
}

function removeOnlineSocket(accountId, socketId) {
  const accountSockets = onlineAccounts.get(accountId);
  if (!accountSockets) return false;
  accountSockets.delete(socketId);
  if (accountSockets.size) return false;
  onlineAccounts.delete(accountId);
  return true;
}

function isAccountOnline(accountId) {
  return Boolean(onlineAccounts.get(String(accountId))?.size);
}

function acknowledge(callback, payload) {
  if (typeof callback === 'function') {
    callback({ success: true, data: payload });
  }
}

function rejectEvent(socket, eventName, callback, error, context = {}) {
  const payload = { ...context, message: error.message };
  socket.emit(`${eventName}Failed`, payload);
  if (typeof callback === 'function') {
    callback({ success: false, error: error.message });
  }
}

async function initSocket(httpServer) {
  const {
    createMessageServices,
    replyMessageServices,
    reactMessageServices,
    removeMessageReactionServices,
    pinMessageServices,
    unpinMessageServices,
    updateMessageServices,
    deleteMessageServices,
    renameConversationServices,
    updateGroupMemberServices,
    updateGroupProfileImageServices,
    removeGroupMemberServices,
    authorizeSocketRoomServices,
    typingEventServices,
    markConversationReadServices,
    callSignalServices,
    getActiveCallForAccountServices,
    expireCallServices,
    getActiveGroupCallServices,
    getAllInboxesByAccountIdServices,
    getConversationSummaryServices,
  } = require('../services/InboxServices');
  const {
    markNotificationAsReadServices,
    markAllNotificationsAsReadServices,
    getNotificationsByAccountIdServices,
  } = require('../services/NotificationServices');

  console.log('Socket.IO WebSocket server initialized');
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
      allowedHeaders: [
        "Content-Type",
        "ngrok-skip-browser-warning",
      ],
      methods: ["GET", "POST"],
    },
  });
  
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error('Authentication error: No cookies provided.'));
      }

      const accessToken = cookie.parse(cookieHeader).accessToken;
      if (!accessToken) {
        return next(new Error('Authentication error: No accessToken provided.'));
      }

      const decoded = jwt.verify(
        accessToken,
        process.env.ACCESS_TOKEN_JWT_SECRET
      );
      if (!decoded.account_id) {
        return next(new Error('Authentication error: Invalid account token.'));
      }
      socket.user = decoded;
      return next();
    } catch (_error) {
      return next(new Error('Authentication error: Invalid or expired token.'));
    }
  });

  io.on('connection', (socket) => {
    const accountId = String(socket.user.account_id);
    const becameOnline = addOnlineSocket(accountId, socket.id);

    // Account rooms are retained for the existing notification flow.
    socket.join(accountId);

    socket.on('joinRoom', async (roomPayload, callback) => {
      const roomId =
        typeof roomPayload === 'object'
          ? roomPayload?.conversation_id || roomPayload?.room_id
          : roomPayload;
      try {
        const room = await authorizeSocketRoomServices(roomId, accountId);
        await socket.join(room.room_id);

        const joinedPayload = {
          room_id: room.room_id,
          room_type: room.room_type,
        };
        socket.emit('conversationJoined', joinedPayload);
        acknowledge(callback, joinedPayload);

        if (room.room_type === 'conversation') {
          socket.emit('conversationPresence', {
            conversation_id: room.room_id,
            members: room.members.map((memberAccountId) => ({
              account_id: memberAccountId,
              is_online: isAccountOnline(memberAccountId),
            })),
          });
          socket.to(room.room_id).emit('presenceChanged', {
            conversation_id: room.room_id,
            account_id: accountId,
            is_online: true,
          });
        }
      } catch (error) {
        rejectEvent(socket, 'roomJoin', callback, error, { room_id: roomId });
      }
    });

    socket.on('leaveRoom', async (roomPayload, callback) => {
      const roomId =
        typeof roomPayload === 'object'
          ? roomPayload?.conversation_id || roomPayload?.room_id
          : roomPayload;
      try {
        const room = await authorizeSocketRoomServices(roomId, accountId);
        if (room.room_type === 'conversation') {
          await socket.leave(room.room_id);
        }
        const leftPayload = {
          room_id: room.room_id,
          room_type: room.room_type,
        };
        socket.emit('conversationLeft', leftPayload);
        acknowledge(callback, leftPayload);
      } catch (error) {
        rejectEvent(socket, 'roomLeave', callback, error, { room_id: roomId });
      }
    });

    socket.on('joinForumRooms', ({ groupId, discussionId } = {}) => {
      const rooms = groupId || discussionId
        ? [
            groupId && `forum:group:${groupId}`,
            discussionId && `forum:discussion:${discussionId}`,
          ].filter(Boolean)
        : ['forum'];
      socket.join(rooms);
    });

    socket.on('leaveForumRooms', ({ groupId, discussionId } = {}) => {
      const rooms = groupId || discussionId
        ? [
            groupId && `forum:group:${groupId}`,
            discussionId && `forum:discussion:${discussionId}`,
          ].filter(Boolean)
        : ['forum'];
      rooms.forEach((room) => socket.leave(room));
    });

    const handleSendMessage = async (messagePayload = {}, callback) => {
      try {
        const message = await createMessageServices(messagePayload, accountId, {
          onNotification: (recipientId, notification) => {
            io.to(String(recipientId)).emit('notification', notification);
            io.to(String(recipientId)).emit('conversationMessageNotification', messagePayload);
          },
        });
        io.to(message.conversation_id).emit('newMessage', message);
        acknowledge(callback, message);
      } catch (error) {
        rejectEvent(socket, 'messageSend', callback, error);
      }
    };
    socket.on('sendMessage', handleSendMessage);
    socket.on('messageDirect', handleSendMessage);

    socket.on('replyMessage', async (payload = {}, callback) => {
      try {
        const parentMessageId = payload.parent_message_id || payload.message_id_reply;
        const reply = await replyMessageServices(parentMessageId, payload, accountId, {
          onNotification: (recipientId, notification) => {
            io.to(String(recipientId)).emit('notification', notification);
            io.to(String(recipientId)).emit('conversationMessageNotification', reply);
          },
        });
        io.to(reply.conversation_id).emit('messageReplied', reply);
        acknowledge(callback, reply);
      } catch (error) {
        rejectEvent(socket, 'messageReply', callback, error);
      }
    });

    socket.on('reactMessage', async (payload = {}, callback) => {
      try {
        const message = payload.remove
          ? await removeMessageReactionServices(payload.message_id, accountId)
          : await reactMessageServices(
              payload.message_id,
              payload.react_type,
              accountId,
              {
                onNotification: (recipientId, notification) => {
                  io.to(String(recipientId)).emit('notification', notification);
                },
              }
            );
        io.to(message.conversation_id).emit('messageReactionUpdated', message);
        acknowledge(callback, message);
      } catch (error) {
        rejectEvent(socket, 'messageReaction', callback, error);
      }
    });

    socket.on('pinMessage', async (payload = {}, callback) => {
      try {
        const inbox = await pinMessageServices(
          payload.conversation_id,
          payload.message_id,
          accountId
        );
        io.to(String(inbox._id)).emit('messagePinned', {
          conversation_id: String(inbox._id),
          pinned_messages: inbox.pinned_messages,
          message_id: String(payload.message_id),
        });
        acknowledge(callback, inbox);
      } catch (error) {
        rejectEvent(socket, 'messagePin', callback, error);
      }
    });

    socket.on('unpinMessage', async (payload = {}, callback) => {
      try {
        const inbox = await unpinMessageServices(
          payload.conversation_id,
          payload.message_id,
          accountId
        );
        io.to(String(inbox._id)).emit('messageUnpinned', {
          conversation_id: String(inbox._id),
          pinned_messages: inbox.pinned_messages,
          message_id: String(payload.message_id),
        });
        acknowledge(callback, inbox);
      } catch (error) {
        rejectEvent(socket, 'messageUnpin', callback, error);
      }
    });

    const handleEditMessage = async (payload = {}, callback) => {
      try {
        const message = payload.action
          ? await updateMessageServices(
              payload.message_id,
              payload.action,
              payload.payload,
              accountId
            )
          : await updateMessageServices(
              payload.message_id,
              'set',
              { message_content: payload.message_content },
              accountId
            );
        io.to(message.conversation_id).emit('messageUpdated', message);
        const inbox = await getConversationSummaryServices(
          message.conversation_id,
          accountId
        );
        io.to(message.conversation_id).emit('conversationPreviewUpdated', inbox);
        acknowledge(callback, message);
      } catch (error) {
        rejectEvent(socket, 'messageUpdate', callback, error);
      }
    };
    socket.on('updateMessage', handleEditMessage);
    socket.on('editMessage', handleEditMessage);

    socket.on('deleteMessage', async (payload, callback) => {
      const messageId =
        typeof payload === 'object' ? payload?.message_id : payload;
      try {
        const message = await deleteMessageServices(messageId, accountId);
        const deletedPayload = {
          conversation_id: String(message.conversation_id),
          message_id: String(message._id),
          deleted_at: message.deleted_at,
        };
        io.to(message.conversation_id).emit('messageDeleted', deletedPayload);
        const inbox = await getConversationSummaryServices(
          message.conversation_id,
          accountId
        );
        io.to(message.conversation_id).emit('conversationPreviewUpdated', inbox);
        acknowledge(callback, deletedPayload);
      } catch (error) {
        rejectEvent(socket, 'messageDelete', callback, error, {
          message_id: messageId,
        });
      }
    });

    socket.on('renameConversation', async (payload = {}, callback) => {
      try {
        const inbox = await renameConversationServices(
          payload.conversation_id,
          payload.conversation_name,
          accountId
        );
        io.to(String(inbox._id)).emit('conversationRenamed', {
          conversation_id: String(inbox._id),
          conversation_name: inbox.conversation_name,
          updated_at: inbox.updated_at,
        });
        acknowledge(callback, inbox);
      } catch (error) {
        rejectEvent(socket, 'conversationRename', callback, error);
      }
    });

    socket.on('updateGroupMember', async (payload = {}, callback) => {
      try {
        const inbox = await updateGroupMemberServices(
          payload.conversation_id,
          payload.account_id,
          payload.updates || {},
          accountId
        );
        const updatedMember = inbox.members.find(
          (member) => String(member.account_id) === String(payload.account_id)
        );
        if (inbox.membership_event_message) {
          io.to(String(inbox._id)).emit(
            'newMessage',
            inbox.membership_event_message
          );
        }
        if ((updatedMember?.status || 'active') === 'active') {
          io.in(String(payload.account_id)).socketsJoin(String(inbox._id));
        } else {
          io.in(String(payload.account_id)).socketsLeave(String(inbox._id));
        }
        io.to(String(inbox._id)).emit('groupMembersUpdated', inbox);
        acknowledge(callback, inbox);
      } catch (error) {
        rejectEvent(socket, 'groupMemberUpdate', callback, error);
      }
    });

    socket.on('updateGroupProfileImage', async (payload = {}, callback) => {
      try {
        const inbox = await updateGroupProfileImageServices(
          payload.conversation_id,
          payload.image_key,
          accountId
        );
        io.to(String(inbox._id)).emit('groupProfileImageUpdated', inbox);
        acknowledge(callback, inbox);
      } catch (error) {
        rejectEvent(socket, 'groupProfileImageUpdate', callback, error);
      }
    });

    socket.on('removeGroupMember', async (payload = {}, callback) => {
      try {
        const inbox = await removeGroupMemberServices(
          payload.conversation_id,
          payload.account_id,
          accountId
        );
        if (inbox.membership_event_message) {
          io.to(String(inbox._id)).emit(
            'newMessage',
            inbox.membership_event_message
          );
        }
        io.to(String(inbox._id)).emit('groupMembersUpdated', inbox);
        io.in(String(payload.account_id)).socketsLeave(String(inbox._id));
        acknowledge(callback, inbox);
      } catch (error) {
        rejectEvent(socket, 'groupMemberRemove', callback, error);
      }
    });

    socket.on('typing', async (payload = {}, callback) => {
      try {
        const typing = await typingEventServices(
          payload.conversation_id,
          payload.is_typing,
          accountId
        );
        socket.to(typing.conversation_id).emit('typingChanged', typing);
        acknowledge(callback, typing);
      } catch (error) {
        rejectEvent(socket, 'typing', callback, error);
      }
    });

    socket.on('markConversationRead', async (payload, callback) => {
      const conversationId =
        typeof payload === 'object' ? payload?.conversation_id : payload;
      try {
        const seen = await markConversationReadServices(
          conversationId,
          accountId
        );
        io.to(seen.conversation_id).emit('messagesSeen', seen);
        acknowledge(callback, seen);
      } catch (error) {
        rejectEvent(socket, 'conversationRead', callback, error, {
          conversation_id: conversationId,
        });
      }
    });

    socket.on('callSignal', async (payload = {}, callback) => {
      try {
        const callSignal = await callSignalServices(payload, accountId);
        const recipients = callSignal.recipient_account_ids || (
          callSignal.recipient_account_id
            ? [callSignal.recipient_account_id]
            : []
        );
        if (recipients.length) {
          recipients.forEach((recipientId) =>
            io.to(String(recipientId)).emit('callSignal', callSignal)
          );
        }
        if (
          callSignal.signal_type === 'offer' &&
          callSignal.expires_at &&
          !callExpiryTimers.has(callSignal.call_id)
        ) {
          const remaining = Math.max(
            0,
            new Date(callSignal.expires_at).getTime() - Date.now()
          );
          const timer = setTimeout(() => {
            callExpiryTimers.delete(callSignal.call_id);
            const expired = expireCallServices(callSignal.call_id);
            if (!expired) return;
            const members = Array.from(new Set([
              expired.caller_id,
              ...expired.invited_ids,
              ...expired.participant_ids,
            ]));
            members.forEach((memberId) =>
              io.to(String(memberId)).emit('callSignal', {
                conversation_id: expired.conversation_id,
                call_id: expired.call_id,
                account_id: expired.caller_id,
                signal_type: 'end',
                signal: null,
                reason: 'unanswered',
                emitted_at: new Date(),
              })
            );
            if (expired.conversation_type === 'group') {
              io.to(String(expired.conversation_id)).emit('groupCallUpdated', {
                conversation_id: String(expired.conversation_id),
                call: null,
              });
            }
          }, remaining);
          callExpiryTimers.set(callSignal.call_id, timer);
        }
        if (
          callSignal.signal_type === 'answer' ||
          callSignal.signal_type === 'end' ||
          (callSignal.signal_type === 'reject' &&
            callSignal.conversation_type !== 'group')
        ) {
          const timer = callExpiryTimers.get(callSignal.call_id);
          if (timer) clearTimeout(timer);
          callExpiryTimers.delete(callSignal.call_id);
        }
        if (callSignal.conversation_type === 'group') {
          const groupCall = await getActiveGroupCallServices(
            callSignal.conversation_id,
            accountId
          );
          io.to(String(callSignal.conversation_id)).emit('groupCallUpdated', {
            conversation_id: String(callSignal.conversation_id),
            call: groupCall,
          });
        }
        acknowledge(callback, callSignal);
      } catch (error) {
        rejectEvent(socket, 'callSignal', callback, error);
      }
    });

    socket.on('getActiveGroupCall', async (payload = {}, callback) => {
      try {
        const conversationId = String(payload.conversation_id || '');
        const call = await getActiveGroupCallServices(conversationId, accountId);
        acknowledge(callback, call);
      } catch (error) {
        rejectEvent(socket, 'groupCallLookup', callback, error);
      }
    });

    // Existing notification events keep their original names and behavior.
    socket.on('markMessageAsRead', async (notificationId, callback) => {
      try {
        const notification = await markNotificationAsReadServices(
          notificationId,
          accountId
        );
        io.to(accountId).emit('notificationRead', {
          notificationId,
          is_read: true,
        });
        acknowledge(callback, notification);
      } catch (error) {
        rejectEvent(socket, 'notificationRead', callback, error);
      }
    });

    socket.on('markAllNotificationsAsRead', async (_payload, callback) => {
      if (typeof _payload === 'function') {
        callback = _payload;
      }
      try {
        await markAllNotificationsAsReadServices(accountId);
        const notifications = await getNotificationsByAccountIdServices(accountId);
        io.to(accountId).emit('allNotificationsRead', notifications);
        acknowledge(callback, notifications);
      } catch (error) {
        rejectEvent(socket, 'notificationsRead', callback, error);
      }
    });

    socket.on('disconnecting', () => {
      const conversationRooms = [...socket.rooms].filter(
        (room) => room !== socket.id && room !== accountId
      );
      const wentOffline = removeOnlineSocket(accountId, socket.id);
      if (wentOffline) {
        conversationRooms.forEach((conversationId) => {
          socket.to(conversationId).emit('presenceChanged', {
            conversation_id: conversationId,
            account_id: accountId,
            is_online: false,
          });
        });
      }
    });

    socket.on('disconnect', () => {
      // Defensive cleanup in case disconnecting was skipped.
      removeOnlineSocket(accountId, socket.id);
      console.log('Client disconnected:', socket.id);
    });

    // Join all authorized conversation rooms so background chat events and
    // presence remain available without opening each conversation first.
    getAllInboxesByAccountIdServices(accountId)
      .then((inboxes) => {
        if (!socket.connected) return;
        const roomIds = inboxes.map((inbox) => String(inbox._id));
        socket.join(roomIds);
        if (becameOnline) {
          roomIds.forEach((conversationId) => {
            socket.to(conversationId).emit('presenceChanged', {
              conversation_id: conversationId,
              account_id: accountId,
              is_online: true,
            });
          });
        }
        const activeCall = getActiveCallForAccountServices(accountId);
        if (activeCall) socket.emit('callSessionRestored', activeCall);
        inboxes
          .filter((inbox) => inbox.conversation_type === 'group')
          .forEach(async (inbox) => {
            const call = await getActiveGroupCallServices(inbox._id, accountId);
            if (call && socket.connected) {
              socket.emit('groupCallUpdated', {
                conversation_id: String(inbox._id),
                call,
              });
            }
          });
      })
      .catch((error) => {
        console.error('Error joining account conversation rooms:', error);
      });
  });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error('Socket.IO server not initialized. Call initSocket first.');
  }
  return io;
}

function emitForumEvent(type, payload = {}) {
  const rooms = [
    'forum',
    payload.groupId && `forum:group:${payload.groupId}`,
    payload.discussionId && `forum:discussion:${payload.discussionId}`,
  ].filter(Boolean);
  getIo().to(rooms).emit('forum:event', {
    type,
    ...payload,
    emittedAt: new Date().toISOString(),
  });
}

module.exports = {
  initSocket,
  getIo,
  emitForumEvent,
};
