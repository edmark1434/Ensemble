import { io, Socket } from "socket.io-client";
import { devConsoleApiOrigin } from "./consoleHosts";

const SOCKET_URL =
  devConsoleApiOrigin() ||
  import.meta.env.VITE_WEBSOCKET_URL ||
  import.meta.env.VITE_BASE_URL ||
  "http://localhost:4000";

const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  extraHeaders: {
    "ngrok-skip-browser-warning": "true",
  },
});

export default socket;
