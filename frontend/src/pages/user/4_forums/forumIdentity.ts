import api from "@/lib/axios";

export const DEFAULT_FORUM_AVATAR = "/default-avatar.png";

export function forumAvatarUrl(value?: string | null): string {
  if (!value) return DEFAULT_FORUM_AVATAR;
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  const base = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/$/, "");
  return base ? `${base}/${value.replace(/^\//, "")}` : `/${value.replace(/^\//, "")}`;
}

export async function loadCurrentForumAvatar(fallback?: string): Promise<string> {
  try {
    const response = await api.get("/api/accounts/profile/current-avatar");
    return forumAvatarUrl(response.data?.data?.path || response.data?.data?.avatar_preset_url);
  } catch {
    return forumAvatarUrl(fallback);
  }
}

export function identityFromDetails(details: any) {
  return {
    name: details.display_name
      || [details.first_name, details.last_name].filter(Boolean).join(" ")
      || details.handle
      || "Forum member",
    avatar: forumAvatarUrl(details.avatar_preset_url || details.avatar_url || details.path),
  };
}
