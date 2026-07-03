import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:4000";

const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
});

export default socket;