import { dispatch } from "@designcombo/events";
import { ADD_AUDIO, ADD_IMAGE, ADD_VIDEO } from "@designcombo/state";
import type { ITrackItem } from "@designcombo/types";
import useStore from "../store/use-store";
import { normalizeDimensionsToCanvas } from "./dimensions";
import { updateAddedItem, type AddPlacement } from "./optimistic-add";
import { patchPendingUpload } from "../collab/remote-patch";

export interface UploadedMedia {
  type: string;
  fileName: string;
  metadata: { uploadedUrl: string };
  details: { width?: number; height?: number; duration?: number };
}

export function insertPendingUpload(id: string, file: File, placement: AddPlacement) {
  const target = useStore.getState();
  const type = file.type.split("/")[0];
  const event = type === "image" ? ADD_IMAGE : type === "video" ? ADD_VIDEO : ADD_AUDIO;
  const src = `pending-upload:${id}`;
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

  return {
    onUploaded: (upload: UploadedMedia) => settle(item => {
      const width = upload.details.width;
      const height = upload.details.height;
      const dimensions = type === "image" && width && height
        ? normalizeDimensionsToCanvas(width, height, target.size.width, target.size.height)
        : { width, height };
      const details = { ...item.details, src: upload.metadata.uploadedUrl } as Record<string, any>;
      for (const key of ["width", "height"] as const) {
        if (dimensions[key] && initial && details[key] === (initial.details as any)[key]) details[key] = dimensions[key];
      }
      if (initial && details.left === initial.details.left) details.left = `${(target.size.width - details.width) / 2}px`;
      if (initial && details.top === initial.details.top) details.top = `${(target.size.height - details.height) / 2}px`;
      if (initial && details.transform === initial.details.transform && details.width && details.height) {
        details.transform = `scale(${Math.min(target.size.width / (width || details.width), target.size.height / (height || details.height))})`;
      }
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
    }),
    onFailed: () => settle(item => ({
      ...item,
      details: { ...item.details, src: `missing-template-media:${id}` },
      metadata: { ...item.metadata, uploadStatus: "failed" },
    } as ITrackItem)),
  };
}
