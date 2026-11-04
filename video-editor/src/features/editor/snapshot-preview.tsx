"use client";

import Editor from "./editor";
import { SnapshotPreviewContext, type SnapshotPreviewData } from "./hooks/use-snapshot-preview";

export default function SnapshotPreview(preview: SnapshotPreviewData) {
  return <SnapshotPreviewContext.Provider value={preview}>
    <Editor role="Viewer" projectName={preview.name} />
  </SnapshotPreviewContext.Provider>;
}
