import api from "./axios";

export type FinalizedUpload = {
  key: string;
  fileId: string;
};

export type PreparedUpload = {
  uploadIntentId: string;
};

export function resolveContentType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'zip': return 'application/zip';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'mov': return 'video/quicktime';
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'ogg': return 'audio/ogg';
    default: return file.type || 'application/octet-stream';
  }
}

/** Uploads the bytes to the server-issued private staging key without consuming the intent. */
export async function uploadFileToIntent(file: File, folder: string, onProgress?: (loaded: number) => void): Promise<PreparedUpload> {
  const contentType = resolveContentType(file);
  const prepared = await api.post("/api/files/upload-url", {
    folder,
    filename: file.name,
    contentType,
  });
  const { uploadUrl, uploadIntentId, maxFileSize } = prepared.data || {};
  if (!uploadUrl || !uploadIntentId) throw new Error("Unable to prepare file upload");
  if (Number.isFinite(maxFileSize) && file.size > maxFileSize) {
    throw new Error(`File exceeds the ${Math.round(maxFileSize / 1024 / 1024)}MB limit`);
  }

  if (onProgress) {
    // XHR exposes real transferred bytes without adding API/CSRF headers to the storage URL.
    await new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("PUT", uploadUrl);
      request.setRequestHeader("Content-Type", contentType);
      request.upload.onprogress = (event) => onProgress(Math.min(file.size, event.loaded));
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) { onProgress(file.size); resolve(); }
        else reject(new Error(`Upload failed with status ${request.status}`));
      };
      request.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
      request.onabort = () => reject(new Error("Upload cancelled."));
      request.send(file);
    });
  } else {
    const uploaded = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });
    if (!uploaded.ok) throw new Error(`Upload failed with status ${uploaded.status}`);
  }
  return { uploadIntentId };
}

/** Uploads to a private staging key, then asks the server to verify and own the file. */
export async function uploadFileWithIntent(file: File, folder: string, onProgress?: (loaded: number) => void): Promise<FinalizedUpload> {
  const { uploadIntentId } = await uploadFileToIntent(file, folder, onProgress);
  const finalized = await api.post("/api/files/finalize", { uploadIntentId });
  const { key, fileId } = finalized.data || {};
  if (!key || !fileId) throw new Error("Unable to finalize file upload");
  return { key, fileId };
}
