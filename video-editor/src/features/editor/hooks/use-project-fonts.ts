import { useEffect } from "react";
import useStore from "../store/use-store";
import { ensureFont } from "../utils/fonts";

export const useProjectFonts = () => {
  const trackItemsMap = useStore((s) => s.trackItemsMap);

  useEffect(() => {
    Object.values(trackItemsMap).forEach((item: any) => {
      if (item.type !== "text" && item.type !== "caption") return;
      const { fontFamily, fontUrl } = item.details ?? {};
      if (fontFamily && fontUrl) ensureFont(fontFamily, fontUrl);
    });
  }, [trackItemsMap]);
};