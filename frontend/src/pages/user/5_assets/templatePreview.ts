export function templateSnapshotPreviewUrl(previewToken: string, handoffToken: string) {
  const editorUrl = import.meta.env.VITE_EDITOR_URL || "http://localhost:3000";
  return `${editorUrl}/preview/${encodeURIComponent(previewToken)}?${new URLSearchParams({ token: handoffToken })}`;
}
