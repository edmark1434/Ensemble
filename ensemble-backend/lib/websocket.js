// websocket.js
const { Server } = require("socket.io");
let io;

function initSocket(httpServer) {
  if (!io) {
    io = new Server(httpServer, {
      cors: { origin: "*" },
    });

    io.on("connection", (socket) => {
      console.log("New client connected:", socket.id);
      socket.on("join_room", (roomId) => {
        socket.join(roomId);
        socket.data.roomId = roomId;
        console.log(`Client ${socket.id} joined room ${roomId}`);
        socket.to(roomId).emit("user_joined", socket.id);
        io.to(roomId).emit("receive_message", {
            content: `Client ${socket.id} has joined the room ${roomId}.`,
            senderId: "System",
            roomId: roomId,
        });
      });
      socket.on("send_message", (data) => {
        const { roomId, msg } = data;
        console.log("Received message:", msg);
        const messageWithSender = {
          ...msg,
          senderId: socket.id,
           roomId: roomId,
        };
        // Emit to everyone, including sender, with sender identity attached.
        io.to(roomId).emit("receive_message", messageWithSender);
      });
      // Relay WebRTC signaling data to the intended peer only.
      socket.on("signal", ({ to, data }) => {
        if (!to) {
          return;
        }
        io.to(to).emit("signal", { senderId: socket.id, data });
      });
      socket.on("disconnect", () => {
        if (socket.data.roomId) {
          socket.to(socket.data.roomId).emit("user_left", socket.id);
        }
        console.log("Client disconnected:", socket.id);
      });
    });
  }

  return io;
}

module.exports = {
  initSocket
};
