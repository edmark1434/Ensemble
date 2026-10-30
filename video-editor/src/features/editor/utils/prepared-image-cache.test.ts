import assert from "node:assert/strict";
import { test } from "node:test";
import { createPreparedImageCache } from "./prepared-image-cache";

test("images wait for decoding, reuse prepared bytes, and release removed sources", async t => {
  const originalImage = globalThis.Image;
  let finishDecode!: () => void;
  const decoding = new Promise<void>(resolve => { finishDecode = resolve; });
  const fetchMock = t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    assert.equal(input, "https://storage.example/image?signature=first");
    return new Response(new Blob(["image"]));
  });
  const revoke = t.mock.method(URL, "revokeObjectURL", () => {});
  t.mock.method(URL, "createObjectURL", () => "blob:prepared");
  globalThis.Image = class { src = ""; decode() { return decoding; } } as unknown as typeof Image;
  const cache = createPreparedImageCache();
  try {
    let ready = false;
    const first = cache.load("/original", "https://storage.example/image?signature=first");
    assert.equal(cache.load("/original"), first, "Concurrent requests share one download");
    void first.then(() => { ready = true; });
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(ready, false, "Downloaded bytes must not appear before image decoding finishes");
    finishDecode();
    assert.equal(await first, "blob:prepared");
    cache.retain(["/original", "/another"]);
    assert.equal(await cache.load("/original", "https://storage.example/image?signature=renewed"), "blob:prepared");
    assert.equal(fetchMock.mock.callCount(), 1, "Adding media must not redownload existing images");
    cache.retain([]);
    assert.equal(revoke.mock.callCount(), 1);
  } finally { cache.dispose(); globalThis.Image = originalImage; }
});

test("failed image downloads can retry and obsolete downloads cannot produce a ready source", async t => {
  let finishDownload!: (response: Response) => void;
  let attempts = 0;
  t.mock.method(globalThis, "fetch", async () => {
    if (++attempts === 1) return new Response(null, { status: 403 });
    return new Promise<Response>(resolve => { finishDownload = resolve; });
  });
  const create = t.mock.method(URL, "createObjectURL", () => "blob:unexpected");
  const cache = createPreparedImageCache();
  try {
    await assert.rejects(cache.load("/original"), /Unable to load/);
    const retried = cache.load("/original");
    cache.dispose();
    finishDownload(new Response(new Blob(["image"])));
    await assert.rejects(retried, /Aborted/);
    assert.equal(attempts, 2);
    assert.equal(create.mock.callCount(), 0, "A cancelled request must not create a leaked blob URL");
  } finally { cache.dispose(); }
});
