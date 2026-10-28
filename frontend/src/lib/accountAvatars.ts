import { useEffect, useState } from "react";
import api from "@/lib/axios";

export function getFallbackAvatarUrl(name?: string | null): string {
  const cleanName = encodeURIComponent((name || "User").trim());
  return `https://ui-avatars.com/api/?name=${cleanName}&background=71717a&color=fff&size=128`;
}

export function constructAvatarUrl(path?: string | null, name?: string | null): string {
  if (!path || path.trim() === "") {
    return getFallbackAvatarUrl(name);
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const presetMatch = path.match(/p\d+\.png$/i);
  if (presetMatch) {
    return `/profile_presets/${presetMatch[0]}`;
  }
  const cloudfrontUrl = (import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return cloudfrontUrl ? `${cloudfrontUrl}/${cleanPath}` : `/${cleanPath}`;
}

export function resolveAvatarUrl(path?: string | null, name?: string | null): string | null {
  if (!path || path.trim() === "") {
    return name ? getFallbackAvatarUrl(name) : null;
  }
  return constructAvatarUrl(path, name);
}

export function resolveAvatarPath(path?: string | null): string | undefined {
  if (!path || path.trim() === "") return undefined;
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
      .get(`/api/accounts/profile/${accountId}`)
      .then(({ data }) => {
        const profile = data?.data ?? data?.profile ?? data;
        const rawPath = profile?.avatar_preset_url || profile?.avatar_url || profile?.path;
        return resolveAvatarUrl(rawPath, profile?.name || profile?.username || profile?.display_name);
      })
      .catch(async () => {
        try {
          const { data } = await api.get(`/api/accounts/profile/avatars/${accountId}`);
          const payload = data?.data ?? data;
          const avatar = Array.isArray(payload) ? payload[0] : payload;
          return resolveAvatarUrl(avatar?.path || avatar?.avatar_preset_url || avatar?.avatar_url);
        } catch {
          return null;
        }
      });
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
