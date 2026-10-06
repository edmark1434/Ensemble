const trimTrailingSlashes = (s: string) => s.replace(/\/+$/, "");

const MAIN_APP_URL = trimTrailingSlashes(process.env.MAIN_APP_URL ?? "");
const S3_PUBLIC_URL = trimTrailingSlashes(process.env.AWS_S3_PUBLIC_URL ?? "");

// files.path -> a URL an <img> can load from the editor's origin.
//  - absolute URLs pass through
//  - "/public/..." rows are preset avatars that live in the main app's public/
//    folder (Next serves public/ from the root, so "public" isn't in the URL)
//  - anything else is an S3 key ("profile/<id>/photo.png")
export const resolveFileUrl = (path: string | null): string | null => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  if (path.startsWith("/public/")) {
    const rest = path.slice("/public/".length);
    // Rows can look like "/public/profile_presets/p1.png" or "/public/p1.png"
    // (where the file actually sits in profile_presets/), so normalise both.
    const presetPath = rest.startsWith("profile_presets/")
      ? rest
      : `profile_presets/${rest}`;
    return `${MAIN_APP_URL}/${presetPath}`;
  }

  const key = path.replace(/^\/+/, "");
  return S3_PUBLIC_URL ? `${S3_PUBLIC_URL}/${key}` : `${MAIN_APP_URL}/${key}`;
};