# Active Task: Authenticate exports and render only active visuals

## Objective

Authenticate render-server requests through the verified editor session and trusted server bridge; use the real subscription, remove plan-based duration caps, and defer images, text, and captions until active in the renderer and editor.

## Acceptance criteria

- [x] Render create/status/cancel require server authentication and enforce user ownership.
- [x] Export tier comes from the active subscription, never DEBUG_TIER or browser headers.
- [x] Local export downloads require an expiring signed URL.
- [x] No plan-based duration cap remains.
- [x] Inactive images/text/captions skip content creation, font loading, and animation work, including nested scenes and transitions.
- [x] Timeline grouping/indexing is reused between frames; editor videos retain eager mounting.
- [x] Both packages pass TypeScript checks; no broad test suites or live export jobs.

## Verification and rollout

- Editor and renderer TypeScript checks pass. Renderer production bundle builds successfully.
- Focused in-memory checks passed for authenticated identity, forged/expired download rejection, long exports on all tiers, and overlapping/exclusive-end frame queries. No test suites, user projects, or paid render jobs were run.
- Existing editor/render-server INTERNAL_API_SECRET values are configured and match; values were not displayed or changed.
- Restart the render service to load its updated routes/local composition. Lambda uses a separately deployed composition bundle; that deployment has not been changed by this task. Browser playback has not been manually exercised.
