// websocket.js
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
dotenv.config();
let io;


async function initSocket(httpServer) {
  const {
  createMessageServices
} = require('../Services/InboxServices');
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

      socket.on("updateMessage", (messagePayload) => {

      });

      socket.on("deleteMessage", (messageId) => {});

      socket.on("messageDirect", async (messagePayload) => {
        console.log(`Client ${socket.id} sent direct message:`, messagePayload);
       

      });

    


    });



  }

  return io;
}




module.exports = {
  initSocket
};
