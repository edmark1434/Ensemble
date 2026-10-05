import { useEffect, useState } from "react";
import api from "@/lib/axios";

export function resolveAvatarUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const presetMatch = path.match(/p\d+\.png$/i);
  if (presetMatch) return `/profile_presets/${presetMatch[0]}`;
  const cloudfrontUrl = (import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return cloudfrontUrl ? `${cloudfrontUrl}/${cleanPath}` : `/${cleanPath}`;
}

const cache = new Map<string, Promise<string | null>>();

export function fetchAccountAvatarUrl(accountId: string): Promise<string | null> {
  let pending = cache.get(accountId);
  if (!pending) {
    pending = api
      .get(`/api/accounts/profile/avatars/${accountId}`)
      .then(({ data }) => {
        const payload = data?.data ?? data;
        const avatar = Array.isArray(payload) ? payload[0] : payload;
        return resolveAvatarUrl(avatar?.path || avatar?.avatar_preset_url || avatar?.avatar_url);
      })
      .catch(() => null);
    cache.set(accountId, pending);
  }
  return pending;
}

export function useAccountAvatars(accountIds: string[]): Record<string, string | null> {
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});
  const key = Array.from(new Set(accountIds.filter(Boolean))).sort().join(",");

  useEffect(() => {
    if (!key) return;
    let active = true;
    key.split(",").forEach((id) => {
      fetchAccountAvatarUrl(id).then((url) => {
        if (active) setAvatars((prev) => (prev[id] === url ? prev : { ...prev, [id]: url }));
      });
    });
    return () => { active = false; };
  }, [key]);

  return avatars;
}
