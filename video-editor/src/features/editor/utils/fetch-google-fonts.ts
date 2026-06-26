import { IFont } from "../interfaces/editor";

interface GoogleFontVariant {
  variant: string;
  url: string;
}

export interface GoogleFontApiItem {
  family: string;
  category: string;
  subsets: string[];
  tags: string[]; // flattened tag strings from the API, e.g. "/Sans/Humanist"
  variants: GoogleFontVariant[];
}

// ---------------------------------------------------------------------------
// Variant helpers
// ---------------------------------------------------------------------------

const variantToStyleName = (variant: string): string => {
  if (variant === "regular") return "Regular";
  if (variant === "italic") return "Italic";

  const weightMatch = variant.match(/^(\d+)(italic)?$/);
  if (weightMatch) {
    const weight = weightMatch[1];
    const isItalic = !!weightMatch[2];
    const weightNames: Record<string, string> = {
      "100": "Thin",
      "200": "ExtraLight",
      "300": "Light",
      "400": "Regular",
      "500": "Medium",
      "600": "SemiBold",
      "700": "Bold",
      "800": "ExtraBold",
      "900": "Black"
    };
    const weightName = weightNames[weight] || weight;
    return isItalic ? `${weightName} Italic` : weightName;
  }

  return variant;
};

const toIFont = (item: GoogleFontApiItem, variant: GoogleFontVariant): IFont => {
  const styleName = variantToStyleName(variant.variant).replace(/\s+/g, "");
  const familySlug = item.family.replace(/\s+/g, "");
  const postScriptName = `${familySlug}-${styleName}`;

  return {
    id: `google_${familySlug}_${variant.variant}`,
    family: item.family,
    fullName: `${item.family} ${variantToStyleName(variant.variant)}`,
    postScriptName,
    preview: "",
    style: variantToStyleName(variant.variant),
    url: variant.url,
    category: item.category,
    createdAt: "",
    updatedAt: "",
    userId: null
  };
};

// ---------------------------------------------------------------------------
// Module-level cache — one fetch for the entire app session
// ---------------------------------------------------------------------------

let _cachedItems: GoogleFontApiItem[] | null = null;
let _fetchPromise: Promise<GoogleFontApiItem[]> | null = null;

/**
 * Fetches ALL Google Fonts sorted by popularity, caching the result in
 * module scope so subsequent calls are instant (no extra network round trips).
 */
export const fetchAllFontItems = async (): Promise<GoogleFontApiItem[]> => {
  if (_cachedItems) return _cachedItems;

  // Deduplicate concurrent callers — only one in-flight request at a time
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = (async () => {
    const response = await fetch("/api/google-fonts?sort=popularity");
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Fonts: ${response.status}`);
    }
    const data: { items: GoogleFontApiItem[] } = await response.json();
    _cachedItems = data.items;
    _fetchPromise = null;
    return _cachedItems;
  })();

  return _fetchPromise;
};

/**
 * Returns a flat list of IFont objects for a given family item.
 * Useful when you need to load a specific family's variants.
 */
export const itemToFonts = (item: GoogleFontApiItem): IFont[] =>
  item.variants.map((variant) => toIFont(item, variant));

/**
 * Gets the default (Regular or first available) IFont for a family item.
 */
export const getDefaultFont = (item: GoogleFontApiItem): IFont => {
  const regularVariant =
    item.variants.find((v) => v.variant === "regular") ?? item.variants[0];
  return toIFont(item, regularVariant);
};