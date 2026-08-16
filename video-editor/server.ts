import "./src/env-loader"; // must stay the first import — loads env before ./websocket (and transitively @/lib/db) evaluates
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { attachWebSocketServer } from "@/websocket";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
  });

  attachWebSocketServer(server, app);

  server.listen(port, () => {
    console.log(`Editor ready on http://${hostname}:${port}`);
  });
});