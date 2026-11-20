import { dispatch } from "@designcombo/events";
import { ADD_AUDIO, ADD_IMAGE, ADD_VIDEO } from "@designcombo/state";
import type { ITrackItem } from "@designcombo/types";
import useStore from "../store/use-store";
import { normalizeDimensionsToCanvas } from "./dimensions";
import { updateAddedItem, type AddPlacement } from "./optimistic-add";
import { patchPendingUpload } from "../collab/remote-patch";
import { aliasLocalMedia, registerLocalMedia, releaseLocalMedia } from "./local-media-cache";

export interface UploadedMedia {
  type: string;
  fileName: string;
  metadata: { uploadedUrl: string };
  details: { width?: number; height?: number; duration?: number };
}

function probeLocalFile(url: string, type: string): Promise<{ width?: number; height?: number; duration?: number }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve({}); return; }
    if (type === "image") {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({});
      img.src = url;
      return;
    }
    const media = document.createElement(type === "audio" ? "audio" : "video");
    media.preload = "metadata";
    const finish = (result: { width?: number; height?: number; duration?: number }) => {
      media.onloadedmetadata = null;
      media.onerror = null;
      media.removeAttribute("src");
      media.load();
      resolve(result);
    };
    media.onloadedmetadata = () => finish({
      duration: Number.isFinite(media.duration) && media.duration > 0 ? media.duration : undefined,
      ...(media instanceof HTMLVideoElement && media.videoWidth && media.videoHeight
        ? { width: media.videoWidth, height: media.videoHeight }
        : {}),
    });
    media.onerror = () => finish({});
    media.src = url;
  });
}

export function insertPendingUpload(id: string, file: File, placement: AddPlacement) {
  const target = useStore.getState();
  const type = file.type.split("/")[0];
  const event = type === "image" ? ADD_IMAGE : type === "video" ? ADD_VIDEO : ADD_AUDIO;
  const src = `pending-upload:${id}`;
  const localUrl = registerLocalMedia(src, file);
  dispatch(event, {
    payload: {
      id, type, details: { src },
      metadata: { name: file.name, uploadStatus: "uploading" },
      display: { from: placement.time, to: placement.time + 5000 },
    },
    options: placement,
  });
  const initial = useStore.getState().trackItemsMap[id];

  const settle = (update: (item: ITrackItem) => ITrackItem) => {
    const current = useStore.getState();
    if (current.userId !== target.userId) return;
    const guarded = (item: ITrackItem) => item.details.src === src ? update(item) : item;
    if (current.projectId === target.projectId && current.activeSceneBlockId === target.activeSceneBlockId &&
      current.collabSchema === target.collabSchema) {
      updateAddedItem(id, guarded);
    } else {
      // Uploads outlive scene navigation. Update their original document only.
      void patchPendingUpload(target.projectId, target.userId,
        target.activeSceneBlockId ? { kind: "block", id: target.activeSceneBlockId } : { kind: "project", id: target.projectId },
        id, src, update).catch(error => console.error("Unable to finish uploaded clip", error));
    }
  };

  // Immediately size & time the local clip from browser memory (~10ms) so the
  // canvas displays the right aspect ratio and clip length while uploading.
  void probeLocalFile(localUrl, type).then((meta) => {
    if (!meta.width && !meta.height && !meta.duration) return;
    const current = useStore.getState();
    if (current.projectId !== target.projectId || current.activeSceneBlockId !== target.activeSceneBlockId ||
      current.collabSchema !== target.collabSchema) return;
    updateAddedItem(id, (item) => {
      if (item.details.src !== src) return item;
      const dimensions = (type === "image" || type === "video") && meta.width && meta.height
        ? normalizeDimensionsToCanvas(meta.width, meta.height, target.size.width, target.size.height)
        : { width: meta.width, height: meta.height };
      const details = { ...item.details } as Record<string, any>;
      for (const key of ["width", "height"] as const) {
        if (dimensions[key] && initial && details[key] === (initial.details as any)[key]) details[key] = dimensions[key];
      }
      if (initial && details.left === initial.details.left) details.left = `${(target.size.width - details.width) / 2}px`;
      if (initial && details.top === initial.details.top) details.top = `${(target.size.height - details.height) / 2}px`;
      const probedDuration = type !== "image" && meta.duration ? meta.duration * 1000 : undefined;
      const duration = probedDuration ?? item.duration;
      const untouchedTiming = probedDuration !== undefined &&
        item.display.to - item.display.from === 5000 &&
        item.trim?.from === 0 && item.trim?.to === 5000;
      return {
        ...item, details, duration,
        ...(untouchedTiming ? {
          trim: { from: 0, to: probedDuration },
          display: { from: item.display.from, to: item.display.from + probedDuration / (item.playbackRate || 1) },
        } : {}),
      } as ITrackItem;
    });
  });

  return {
    onUploaded: (upload: UploadedMedia) => {
      // Alias the final cloud URL to the existing local blob so the media
      // element keeps playing/displaying with zero flicker or re-download.
      aliasLocalMedia(src, upload.metadata.uploadedUrl);
      settle(item => {
        const width = upload.details.width;
        const height = upload.details.height;
        const dimensions = (type === "image" || type === "video") && width && height
          ? normalizeDimensionsToCanvas(width, height, target.size.width, target.size.height)
          : { width, height };
        const details = { ...item.details, src: upload.metadata.uploadedUrl } as Record<string, any>;
        for (const key of ["width", "height"] as const) {
          if (dimensions[key] && initial && details[key] === (initial.details as any)[key]) details[key] = dimensions[key];
        }
        if (initial && details.left === initial.details.left) details.left = `${(target.size.width - details.width) / 2}px`;
        if (initial && details.top === initial.details.top) details.top = `${(target.size.height - details.height) / 2}px`;
        const duration = type === "image" ? 5000 : (upload.details.duration || 5) * 1000;
        const untouchedTiming = item.display.to - item.display.from === 5000 &&
          item.trim?.from === 0 && item.trim?.to === 5000;
        return {
          ...item, details, duration,
          metadata: { ...item.metadata, ...upload.metadata, name: upload.fileName, uploadStatus: "uploaded", previewUrl: type === "image" ? upload.metadata.uploadedUrl : "" },
          ...(untouchedTiming ? {
            trim: { from: 0, to: duration },
            display: { from: item.display.from, to: item.display.from + duration / (item.playbackRate || 1) },
          } : {}),
        } as ITrackItem;
      });
      releaseLocalMedia(src);
    },
    onFailed: () => {
      releaseLocalMedia(src);
      settle(item => ({
        ...item,
        details: { ...item.details, src: `missing-template-media:${id}` },
        metadata: { ...item.metadata, uploadStatus: "failed" },
      } as ITrackItem));
    },
  };
}
