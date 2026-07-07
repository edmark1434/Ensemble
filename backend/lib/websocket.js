// websocket.js
const { Server } = require("socket.io");
let io;

async function initSocket(httpServer) {
  console.log("Socket.IO WebSocket server initialized");
  if (!io) {
    io = new Server(httpServer, {
      cors: { origin: "*" },
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

    });


  }

  return io;
}

module.exports = {
  initSocket
};
