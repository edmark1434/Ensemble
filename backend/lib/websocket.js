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
    });
  }

  return io;
}

module.exports = {
  initSocket
};
