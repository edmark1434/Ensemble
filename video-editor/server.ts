import "./src/env-loader"; // must stay the first import — loads env before ./websocket (and transitively @/lib/db) evaluates
import { createServer, type ServerResponse } from "http";
import next from "next";
import { attachWebSocketServer } from "@/websocket";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const NO_STORE = "private, no-cache, no-store, max-age=0, must-revalidate";

// Next sends its 404 for a missing /_next/static file with no Cache-Control,
// so Cloudflare caches it at the edge and tells browsers to keep it for 4 hours.
// A chunk that is briefly missing mid-deploy then stays broken long after the
// files are back. Error responses for build assets must never be cached.
function neverCacheErrors(res: ServerResponse) {
  const writeHead = res.writeHead;
  res.writeHead = ((statusCode: number, ...rest: unknown[]) => {
    if (statusCode >= 400) res.setHeader("Cache-Control", NO_STORE);
    return Reflect.apply(writeHead, res, [statusCode, ...rest]);
  }) as typeof res.writeHead;
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    let url: URL;
    try {
      url = new URL(req.url ?? "/", "http://localhost");
    } catch {
      res.writeHead(400).end();
      return;
    }
    req.url = url.pathname + url.search;
    if (url.pathname.startsWith("/_next/")) neverCacheErrors(res);
    handle(req, res);
  });

  attachWebSocketServer(server, app);

  server.listen(port, () => {
    console.log(`Editor ready on http://${hostname}:${port}`);
  });
});
