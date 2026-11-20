# Fix market asset loading failures in the video editor

## Implementation objective

Prevent licensed marketplace images from expiring before S3 fetches complete (including under server clock drift or lazy mounting) and add automatic fallback + retry recovery for market images and videos.

## Acceptance criteria

- `signMarketImage` and `market-license-service.ts` sign licensed S3 market images with a 5-minute signing window and 1-hour expiry (`expiresIn: 3600`, `private, max-age=300`), matching streams and CloudFront grants.
- `MarketAssetLicensing` only forwards direct signed image URLs when `expiresAt > Date.now()`, falling back to `/api/market-assets/[id]/source` otherwise.
- `createPreparedImageCache` falls back to the logical `/api/market-assets/[id]/source` endpoint when a direct signed URL fails.
- `PrepareMarketImages` retries failed market image loads with backoff, clears stale `failed` state on retry/removal, and cleans up retry timers.
- `PreviewVideo` switches to `/api/market-assets/[id]/source` on retry when a direct signed market video URL fails.
