import type { ITrackItem } from "@designcombo/types";

export const isCanvasItemAtTime = (item: ITrackItem | undefined, time: number): boolean =>
  !!item && item.type !== "audio" && !item.details?.hidden
  && item.display.from <= time && time < item.display.to;

export const getIdFromClassName = (input: string): string => {
  const regex = /designcombo-scene-item id-([^ ]+)/;
  const match = input.match(regex);
  return match ? match[1] : (null as unknown as string);
};
