import { fetchAllFontItems, getDefaultFont, itemToFonts } from "./fetch-google-fonts";
import useDataState from "../store/use-data-state";
import { IFont } from "../interfaces/editor";

let cachedDefaultFont: IFont | null = null;

export const seedDefaultFont = async (): Promise<IFont | null> => {
  if (cachedDefaultFont) return cachedDefaultFont;

  const items = await fetchAllFontItems();
  const fontItem = items.find((item) => item.family === "Plus Jakarta Sans");
  if (!fontItem) return null;

  const styles = itemToFonts(fontItem);
  const defaultFont = getDefaultFont(fontItem);

  const { setFonts, setCompactFonts, fonts, compactFonts } =
    useDataState.getState();

  if (!compactFonts.some((f) => f.family === "Plus Jakarta Sans")) {
    setFonts([...fonts, ...styles]);
    setCompactFonts([
      ...compactFonts,
      { family: "Plus Jakarta Sans", styles, default: defaultFont }
    ]);
  }

  cachedDefaultFont = defaultFont;
  return defaultFont;
};