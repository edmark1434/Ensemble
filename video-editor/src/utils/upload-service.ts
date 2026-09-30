import axios from "axios";

export type UploadProgressCallback = (
  uploadId: string,
  progress: number
) => void;

export type UploadStatusCallback = (
  uploadId: string,
  status: "uploaded" | "failed",
  error?: string
) => void;

export type FileNameResolvedCallback = (
  uploadId: string,
  fileName: string
) => void;

export interface UploadCallbacks {
  onProgress: UploadProgressCallback;
  onStatus: UploadStatusCallback;
  onFileNameResolved?: FileNameResolvedCallback;
}

type ProbedMetadata = {
  width?: number;
  height?: number;
  durationSeconds?: number;
};

// Browser-only: reads width/height/duration off a File before it's uploaded,
// using Image/video/audio elements rather than shelling out anywhere.
function probeMediaFile(file: File): Promise<ProbedMetadata> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(objectUrl);

    // Don't let a corrupt/unreadable file stall the whole upload.
    const timeout = setTimeout(() => {
      cleanup();
      resolve({});
    }, 8000);

    const finish = (result: ProbedMetadata) => {
      clearTimeout(timeout);
      cleanup();
      resolve(result);
    };

    if (file.type.startsWith("image/")) {
      const img = new Image();
      img.onload = () =>
        finish({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => finish({});
      img.src = objectUrl;
      return;
    }

    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.onloadedmetadata = () =>
        finish({
          width: video.videoWidth,
          height: video.videoHeight,
          durationSeconds: Number.isFinite(video.duration)
            ? Math.round(video.duration)
            : undefined
        });
      video.onerror = () => finish({});
      video.src = objectUrl;
      return;
    }

    if (file.type.startsWith("audio/")) {
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.onloadedmetadata = () =>
        finish({
          durationSeconds: Number.isFinite(audio.duration)
            ? Math.round(audio.duration)
            : undefined
        });
      audio.onerror = () => finish({});
      audio.src = objectUrl;
      return;
    }

    finish({});
  });
}

export async function processFileUpload(
  uploadId: string,
  file: File,
  callbacks: UploadCallbacks,
  userId: string,
  projectId: string
): Promise<any> {
  try {
    // Probe in parallel with the presign request — no reason to wait on it.
    const [{ data: { uploads } }, probed] = await Promise.all([
      axios.post(
        "/api/uploads/presign",
        {
          userId: userId,
          fileNames: [file.name]
        },
        {
          headers: { "Content-Type": "application/json" }
        }
      ),
      probeMediaFile(file)
    ]);

    const uploadInfo = uploads[0];

    callbacks.onFileNameResolved?.(uploadId, uploadInfo.fileName);

    // Upload file with progress tracking
    await axios.put(uploadInfo.presignedUrl, file, {
      headers: { "Content-Type": uploadInfo.contentType },
      onUploadProgress: (progressEvent) => {
        const percent = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        );
        callbacks.onProgress(uploadId, percent);
      },
      validateStatus: () => true
    });

    await axios.post("/api/uploads/complete", {
      filePath: uploadInfo.filePath,
      fileName: uploadInfo.fileName,
      contentType: uploadInfo.contentType,
      fileSize: file.size,
      userId: userId,
      projectId: projectId,
      width: probed.width,
      height: probed.height,
      durationSeconds: probed.durationSeconds
    });

    // Construct upload data from uploadInfo
    const uploadData = {
      fileName: uploadInfo.fileName,
      filePath: uploadInfo.filePath,
      fileSize: file.size,
      contentType: uploadInfo.contentType,
      metadata: { uploadedUrl: uploadInfo.url },
      folder: uploadInfo.folder || null,
      type: uploadInfo.contentType.split("/")[0],
      method: "direct",
      origin: "user",
      status: "uploaded",
      isPreview: false,
      details: {
        width: probed.width,
        height: probed.height,
        duration: probed.durationSeconds
      }
    };

    callbacks.onStatus(uploadId, "uploaded");
    return uploadData;
  } catch (error) {
    callbacks.onStatus(uploadId, "failed", (error as Error).message);
    throw error;
  }
}

export async function processUrlUpload(
  uploadId: string,
  url: string,
  callbacks: UploadCallbacks,
  userId: string,
  projectId: string,
  estimatedBytes?: number,
  dimensions?: { width?: number; height?: number; durationSeconds?: number }
): Promise<any[]> {
  const BYTES_PER_SEC_ESTIMATE = 2 * 1024 * 1024; // conservative; fetch+reupload is slower than a direct PUT
  const estimatedMs = estimatedBytes
    ? Math.min(30000, Math.max(2000, (estimatedBytes / BYTES_PER_SEC_ESTIMATE) * 1000))
    : 6000;

  let simulated = 10;
  callbacks.onProgress(uploadId, simulated);
  const interval = setInterval(() => {
    simulated = Math.min(85, simulated + 3);
    callbacks.onProgress(uploadId, Math.round(simulated));
  }, Math.max(200, estimatedMs / 25));

  try {
    const hasDims = dimensions && (dimensions.width || dimensions.height || dimensions.durationSeconds);
    const { data: { uploads = [], failed = [] } = {} } = await axios.post(
      "/api/uploads/url",
      { userId, projectId, urls: [hasDims ? { url, ...dimensions } : url] },
      { headers: { "Content-Type": "application/json" } }
    );
    clearInterval(interval);

    if (uploads.length === 0) {
      const message = failed[0] || "Failed to fetch URL";
      callbacks.onStatus(uploadId, "failed", message);
      throw new Error(message);
    }

    const resolvedFileName = uploads[0]?.fileName;
    if (resolvedFileName) {
      callbacks.onFileNameResolved?.(uploadId, resolvedFileName);
    }

    callbacks.onProgress(uploadId, 100);
    callbacks.onStatus(uploadId, "uploaded");

    return uploads.map((uploadInfo: any) => ({
      fileName: uploadInfo.fileName,
      filePath: uploadInfo.filePath,
      fileSize: 0,
      contentType: uploadInfo.contentType,
      metadata: { originalUrl: uploadInfo.originalUrl },
      folder: uploadInfo.folder || null,
      type: uploadInfo.contentType.split("/")[0],
      method: "url",
      origin: "user",
      status: "uploaded",
      isPreview: false,
      details: {
        width: uploadInfo.width,
        height: uploadInfo.height,
        duration: uploadInfo.durationSeconds
      }
    }));
  } catch (err) {
    clearInterval(interval);
    throw err;
  }
}

export async function processUpload(
  uploadId: string,
  upload: { file?: File; url?: string },
  callbacks: UploadCallbacks,
  userId: string,
  projectId: string,
  estimatedBytes?: number,
  dimensions?: { width?: number; height?: number; durationSeconds?: number }
): Promise<any> {
  if (upload.file) {
    return await processFileUpload(uploadId, upload.file, callbacks, userId, projectId);
  }
  if (upload.url) {
    return await processUrlUpload(
      uploadId,
      upload.url,
      callbacks,
      userId,
      projectId,
      estimatedBytes ? estimatedBytes : undefined,
      dimensions ? dimensions : undefined,
    );
  }
  callbacks.onStatus(uploadId, "failed", "No file or URL provided");
  throw new Error("No file or URL provided");
}