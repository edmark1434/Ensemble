"use client";

import { useEffect } from "react";
import "./globals.css";

// A ChunkLoadError means the page came from one build and the browser asked for
// a chunk the server no longer (or doesn't yet) have — usually a deploy landing
// while the editor was loading. One full reload picks up the current build. The
// timestamp guard stops a reload loop when the chunk really is gone.
const RELOAD_KEY = "ensemble:chunk-reload-at";
const RELOAD_COOLDOWN_MS = 30_000;

function isChunkLoadError(error: Error | undefined) {
  if (!error) return false;
  return error.name === "ChunkLoadError" || /failed to load chunk|loading chunk [\w-]+ failed/i.test(error.message ?? "");
}

function reloadOnceForChunkError() {
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY)) || 0;
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return;
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return; // no storage means no loop guard, so leave it to the button
  }
  window.location.reload();
}

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const chunkError = isChunkLoadError(error);

  useEffect(() => {
    if (chunkError) reloadOnceForChunkError();
  }, [chunkError]);

  return (
    <html lang="en" className="dark">
      <body className="antialiased font-sans bg-muted">
        <main className="flex min-h-screen items-center justify-center p-6">
          <div className="max-w-md rounded-xl border border-border bg-background p-6">
            <h1 className="text-lg font-semibold">
              {chunkError ? "The editor was just updated" : "Something went wrong"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {chunkError
                ? "A newer version is available. Reload to continue — your project is saved."
                : "The editor hit an unexpected error. Reload to try again."}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg border border-border px-3 py-2 text-sm font-semibold"
            >
              Reload
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
