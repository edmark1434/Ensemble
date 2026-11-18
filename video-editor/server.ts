import "./src/env-loader"; // must stay the first import — loads env before ./websocket (and transitively @/lib/db) evaluates
import { createServer } from "http";
import { parse as parseQuery } from "node:querystring";
import next from "next";
import { attachWebSocketServer } from "@/websocket";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    let url: URL;
    try {
      url = new URL(req.url ?? "/", "http://localhost");
    } catch {
      res.writeHead(400).end();
      return;
    }
    handle(req, res, { pathname: url.pathname, query: parseQuery(url.search.slice(1)) });
  });

  attachWebSocketServer(server, app);

  server.listen(port, () => {
    console.log(`Editor ready on http://${hostname}:${port}`);
  });
});
