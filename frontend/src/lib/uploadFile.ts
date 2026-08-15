import api from "./axios";

export type FinalizedUpload = {
  key: string;
  fileId: string;
};

export type PreparedUpload = {
  uploadIntentId: string;
};

/** Uploads the bytes to the server-issued private staging key without consuming the intent. */
export async function uploadFileToIntent(file: File, folder: string): Promise<PreparedUpload> {
  const prepared = await api.post("/api/files/upload-url", {
    folder,
    filename: file.name,
    contentType: file.type,
  });
  const { uploadUrl, uploadIntentId, maxFileSize } = prepared.data || {};
  if (!uploadUrl || !uploadIntentId) throw new Error("Unable to prepare file upload");
  if (Number.isFinite(maxFileSize) && file.size > maxFileSize) {
    throw new Error(`File exceeds the ${Math.round(maxFileSize / 1024 / 1024)}MB limit`);
  }

  const uploaded = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploaded.ok) throw new Error(`Upload failed with status ${uploaded.status}`);
  return { uploadIntentId };
}

/** Uploads to a private staging key, then asks the server to verify and own the file. */
export async function uploadFileWithIntent(file: File, folder: string): Promise<FinalizedUpload> {
  const { uploadIntentId } = await uploadFileToIntent(file, folder);
  const finalized = await api.post("/api/files/finalize", { uploadIntentId });
  const { key, fileId } = finalized.data || {};
  if (!key || !fileId) throw new Error("Unable to finalize file upload");
  return { key, fileId };
}
