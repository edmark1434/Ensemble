import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_WEBSOCKET_URL ||
  import.meta.env.VITE_BASE_URL ||
  "http://localhost:4000";

const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
});

export default socket;
