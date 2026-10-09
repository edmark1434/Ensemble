// video-editor/websocket/index.ts

import type { Server as HttpServer } from "http";
import type { Socket } from "net";
import { WebSocketServer } from "ws";
import { handleCollabConnection } from "./collab";
import { handleCommentsConnection } from "./comments";

const collabWss = new WebSocketServer({ noServer: true });
collabWss.on("connection", handleCollabConnection);

const commentsWss = new WebSocketServer({ noServer: true });
commentsWss.on("connection", handleCommentsConnection);

export function attachWebSocketServer(httpServer: HttpServer, nextApp: any): void {
  // NOTE: verify getUpgradeHandler exists on your installed Next.js version.
  const nextUpgradeHandler = nextApp.getUpgradeHandler?.();

  httpServer.on("upgrade", (req, socket: Socket, head) => {
    const { pathname } = new URL(req.url ?? "", "http://collab");

    if (pathname === "/collab") {
      collabWss.handleUpgrade(req, socket, head, (ws) => {
        collabWss.emit("connection", ws, req);
      });
      return;
    }

    if (pathname === "/comments") {
      commentsWss.handleUpgrade(req, socket, head, (ws) => {
        commentsWss.emit("connection", ws, req);
      });
      return;
    }

    if (nextUpgradeHandler) {
      nextUpgradeHandler(req, socket, head);
    } else {
      socket.destroy();
    }
  });
}