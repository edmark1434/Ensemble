// Only inspect live timeline items, including embedded scenes, never undo history.
export function mediaSourceKey(source: string): string {
  try { return decodeURIComponent(new URL(source, "http://editor.local").pathname).replace(/^\/+/, ""); }
  catch { return source.split(/[?#]/)[0]; }
}

export function mediaSources(content: any, depth = 0, includeHidden = true): string[] {
  if (!content || depth > 20) return [];
  return (content.trackItemIds || []).flatMap((id: string) => {
    const item = content.trackItemsMap?.[id];
    if (!item || (!includeHidden && item.details?.hidden)) return [];
    if (item.type === "scene") return mediaSources(item.details?.content, depth + 1, includeHidden);
    return ["image", "video", "audio"].includes(item.type) && typeof item.details?.src === "string"
      ? [item.details.src]
      : [];
  });
}
