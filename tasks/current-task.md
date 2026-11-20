# Fix video asset preview on asset library info page

## Implementation objective

Render MP4 video thumbnail previews properly with `<video>` instead of `<img>` on the asset details info page (carousel, package preview cards, and purchase modal).

## Acceptance criteria

- `AssetThumbnailCarousel` renders video thumbnail slides (`assets/thumbnails/video-5s-(320|480)/` or `.mp4` files) with `<video>` in both the main preview stage and the slide strip, falls back to `proxy_path` for video/image assets without `thumbnail_path`, and shows `MediaFallback` on error.
- `MediaAssetPreview` in `AssetDetails` chooses `<video>` vs `<img>` based on the resolved preview path so both MP4 video previews and legacy image thumbnails render cleanly.
- `AssetPurchaseModal` renders `<video>` instead of `<img>` when `asset.thumbnail_path` is a video preview.
