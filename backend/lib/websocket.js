// websocket.js
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
dotenv.config();
let io;


async function initSocket(httpServer) {
  const {
    createMessageServices,
    updateMessageServices,
} = require('../Services/InboxServices');
const {
  markNotificationAsReadServices,
  markAllNotificationsAsReadServices,
  getNotificationsByAccountIdServices
} = require('../Services/NotificationServices');
  console.log("Socket.IO WebSocket server initialized");
  if (!io) {
    io = new Server(httpServer, {
      cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true, // Allow credentials (cookies) to be sent
      },
    });

    io.use((socket, next) => {
      const cookieHeader = socket.handshake.headers.cookie;

      if(!cookieHeader) {
        console.warn("No cookies found in the handshake headers.");
        return next(new Error("Authentication error: No cookies provided."));
      }

      const cookies = cookie.parse(cookieHeader);
      const accessToken = cookies.accessToken;
      if(!accessToken) {
        console.warn("No accessToken found in cookies.");
        return next(new Error("Authentication error: No accessToken provided."));
      }
      const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_JWT_SECRET);
      console.log("Decoded JWT:", decoded);
      socket.user = decoded; // Attach user info to socket object for later use
      next();
    });



    io.on("connection", (socket) => {
      console.log("New client connected:", socket.id);
      
      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });

      socket.on("joinRoom", (roomId) => {
        socket.join(roomId);
        console.log(`Client ${socket.id} joined room ${roomId}`);
        io.to(roomId).emit("newMessage", { message: "A new user has joined the room." });
      });

      socket.on("leaveRoom", (roomId) => {
        socket.leave(roomId);
        console.log(`Client ${socket.id} left room ${roomId}`);
      
      });

      socket.on("joinForumRooms", ({ groupId, discussionId } = {}) => {
        const rooms = groupId || discussionId
          ? [
              groupId && `forum:group:${groupId}`,
              discussionId && `forum:discussion:${discussionId}`,
            ].filter(Boolean)
          : ['forum'];
        socket.join(rooms);
      });

      socket.on("leaveForumRooms", ({ groupId, discussionId } = {}) => {
        const rooms = groupId || discussionId
          ? [
              groupId && `forum:group:${groupId}`,
              discussionId && `forum:discussion:${discussionId}`,
            ].filter(Boolean)
          : ['forum'];
        rooms.forEach((room) => socket.leave(room));
      });

      socket.on("sendMessage", async(messagePayload) => {
        delete messagePayload._id; // Remove _id if present
        console.log(`Client ${socket.id} sent message:`, messagePayload);
        try{
          const _id = await createMessageServices(messagePayload);
          messagePayload._id = _id;
          io.to(messagePayload.conversation_id).emit("newMessage", messagePayload);
        } catch (error) {
          console.error("Error creating message:", error);
          io.to(messagePayload.conversation_id).emit("newMessage", { message: "Failed to send message." });
        }
      });

      socket.on("updateMessage", async (messagePayload) => {
        try {
        console.log(`Client ${socket.id} requested message update:`, messagePayload);
        const { message_id, conversation_id, action, payload } = messagePayload;

        const result = await updateMessageServices(
          message_id,
          action,
          payload
        );

          if (result) {
            if (action === "set") { 
              result.is_edited = true;
            }
          io.to(conversation_id).emit("messageUpdated", result);
        } else {
          io.to(conversation_id).emit("messageUpdateFailed", {
            message: "Message not found.",
          });
        }
      } catch (error) {
        console.error("Error updating message:", error);

        io.to(messagePayload.conversation_id).emit("messageUpdateFailed", {
          message: "Failed to update message.",
        });
      }
    });

    socket.on("markMessageAsRead", async (notificationId) => {
      await markNotificationAsReadServices(notificationId);
      console.log(`Client ${socket.id} marked notification ${notificationId} as read.`);
      io.to(socket.user.account_id).emit("notificationRead",{notificationId: notificationId, is_read: true});
    })

    socket.on("markAllNotificationsAsRead", async () => {
      await markAllNotificationsAsReadServices(socket.user.account_id);
      const notifications = await getNotificationsByAccountIdServices(socket.user.account_id);
      console.log(`Client ${socket.id} marked all notifications as read.`);
      io.to(socket.user.account_id).emit("allNotificationsRead", notifications);
    })

      socket.on("deleteMessage", (messageId) => {});

      socket.on("messageDirect", async (messagePayload) => {
        console.log(`Client ${socket.id} sent direct message:`, messagePayload);
       

      });

    


    });



  }

  return io;
}

function getIo(){
  if(!io){
    throw new Error("Socket.IO server not initialized. Call initSocket first.");
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
