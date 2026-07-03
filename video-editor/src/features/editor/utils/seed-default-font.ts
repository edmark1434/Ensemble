import { fetchAllFontItems, getDefaultFont, itemToFonts } from "./fetch-google-fonts";
import useDataState from "../store/use-data-state";
import { IFont } from "../interfaces/editor";

let cachedDefaultFont: IFont | null = null;

export const seedDefaultFont = async (): Promise<IFont | null> => {
  if (cachedDefaultFont) return cachedDefaultFont;

  const items = await fetchAllFontItems();
  const outfitItem = items.find((item) => item.family === "Outfit");
  if (!outfitItem) return null;

  const styles = itemToFonts(outfitItem);
  const defaultFont = getDefaultFont(outfitItem);

  const { setFonts, setCompactFonts, fonts, compactFonts } =
    useDataState.getState();

  if (!compactFonts.some((f) => f.family === "Outfit")) {
    setFonts([...fonts, ...styles]);
    setCompactFonts([
      ...compactFonts,
      { family: "Outfit", styles, default: defaultFont }
    ]);
  }

  cachedDefaultFont = defaultFont;
  return defaultFont;
};