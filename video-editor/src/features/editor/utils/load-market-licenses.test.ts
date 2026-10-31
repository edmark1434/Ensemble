import assert from "node:assert/strict";
import { test } from "node:test";
import { loadMarketLicenses } from "./load-market-licenses";

test("existing licenses are published before unrelated free claims finish", async t => {
  let finishClaim!: (response: Response) => void;
  let startedClaim!: () => void;
  let claimed = false;
  const started = new Promise<void>(resolve => { startedClaim = resolve; });
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") {
      startedClaim();
      return new Promise<Response>(resolve => { finishClaim = resolve; });
    }
    if (claimed && new URL(String(input), "http://localhost").searchParams.get("ids") === "free") {
      return Response.json({ assets: [{ assetId: "free", licensed: true, priceCredits: 0,
        playbackSources: { video: { url: "https://storage.example/free.mp4", expiresAt: Date.now() + 3600000 } } }] });
    }
    return Response.json({ assets: [
      { assetId: "paid", licensed: true, priceCredits: 100, imageSources: { media: "https://storage.example/image" } },
      { assetId: "free", licensed: false, priceCredits: 0 },
    ] });
  });
  const published: string[] = [];
  const loading = loadMarketLicenses("independent-project", ["paid", "free"], undefined, assets => {
    published.push(...assets.map(asset => asset.assetId));
  });
  await started;
  assert.deepEqual(published, ["paid"]);
  claimed = true;
  finishClaim(Response.json({}));
  const result = await loading;
  assert.deepEqual(published, ["paid", "free"]);
  assert.equal(result[0].imageSources?.media, "https://storage.example/image");
  assert.equal(result[1].licensed, true);
  assert.equal(result[1].playbackSources?.video.url, "https://storage.example/free.mp4");
});

test("free use persists across price changes without auto-buying paid assets", async () => {
  const originalFetch = globalThis.fetch;
  let price = 0;
  const licenses = new Set<string>();
  let claims = 0;
  globalThis.fetch = (async (input, init) => {
    const url = new URL(String(input), "http://localhost");
    if (init?.method === "POST") {
      claims++;
      const { projectId } = JSON.parse(String(init.body));
      await new Promise(resolve => setTimeout(resolve, 5));
      assert.equal(price, 0);
      licenses.add(projectId);
      return Response.json({ license: { project_id: projectId } });
    }
    const projectId = url.searchParams.get("projectId")!;
    return Response.json({ assets: [{ assetId: "asset", name: "Image", priceCredits: price, licensed: licenses.has(projectId) }] });
  }) as typeof fetch;
  try {
    const results = await Promise.all([loadMarketLicenses("project-a", ["asset"]), loadMarketLicenses("project-a", ["asset"])]);
    assert.ok(results.every(assets => assets[0].licensed));
    assert.equal(claims, 1, "Concurrent timeline/playback requests share a claim");
    price = 500;
    assert.equal((await loadMarketLicenses("project-a", ["asset"]))[0].licensed, true);
    assert.equal((await loadMarketLicenses("project-b", ["asset"]))[0].licensed, false);
    assert.equal(claims, 1, "New paid projects must not trigger automatic checkout");
  } finally { globalThis.fetch = originalFetch; }
});

test("failed free claims cannot unlock originals", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => init?.method === "POST"
    ? Response.json({ error: "Forbidden" }, { status: 403 })
    : Response.json({ assets: [{ assetId: "asset", name: "Image", priceCredits: 0, licensed: false }] })) as typeof fetch;
  try { assert.equal((await loadMarketLicenses("forbidden-project", ["asset"]))[0].licensed, false); }
  finally { globalThis.fetch = originalFetch; }
});
