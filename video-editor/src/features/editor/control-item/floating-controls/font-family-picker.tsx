import React, { useRef, useState } from "react";
import {X, SearchIcon, Loader2, ChevronDown, Check} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useLayoutStore from "../../store/use-layout-store";
import useClickOutside from "../../hooks/use-click-outside";
import { ICompactFont, IFont } from "../../interfaces/editor";
import { loadFonts } from "../../utils/fonts";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import { ITrackItem } from "@designcombo/types";
import { useGoogleFonts, FontCategory } from "../../hooks/use-google-fonts";
import { getDefaultFont, itemToFonts } from "../../utils/fetch-google-fonts";
import useDataState from "@/features/editor/store/use-data-state";

// ---------------------------------------------------------------------------
// Font change handler (kept export-compatible with old signature for callers
// that import onChangeFontFamily directly)
// ---------------------------------------------------------------------------

export const onChangeFontFamily = async (
  font: ICompactFont,
  trackItem: ITrackItem
) => {
  const fontName = font.default.postScriptName;
  const fontUrl = font.default.url;

  await loadFonts([{ name: fontName, url: fontUrl }]);

  dispatch(EDIT_OBJECT, {
    payload: {
      [trackItem?.id as string]: {
        details: {
          fontFamily: fontName,
          fontUrl: fontUrl,
        },
      },
    },
  });
};

// Internal handler that works directly with IFont (from the new fetch layer)
const applyFont = async (font: IFont, trackItem: ITrackItem) => {
  await loadFonts([{ name: font.postScriptName, url: font.url }]);

  dispatch(EDIT_OBJECT, {
    payload: {
      [trackItem.id as string]: {
        details: {
          fontFamily: font.postScriptName,
          fontUrl: font.url,
        },
      },
    },
  });
};

// ---------------------------------------------------------------------------
// Category labels
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<FontCategory, string> = {
  "sans-serif": "Sans",
  serif: "Serif",
  display: "Display",
  handwriting: "Script",
  monospace: "Mono",
};

// ---------------------------------------------------------------------------
// Font preview — renders the family name in the actual font via a style tag
// ---------------------------------------------------------------------------

const FontPreviewRow = ({
  family,
  isSelected,
  onClick,
}: {
  family: string;
  isSelected: boolean;
  onClick: () => void;
}) => {
  const safeId = family.replace(/\s+/g, "-").toLowerCase();

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&display=swap');`}</style>
      <div
        id={safeId}
        onClick={onClick}
        className="flex cursor-pointer items-center justify-between h-10 px-3 py-2 rounded hover:bg-zinc-800/50 transition-colors"
      >
        <span
          style={{ fontFamily: `"${family}", sans-serif`, fontSize: "15px" }}
          className="leading-none truncate"
        >
          {family}
        </span>
        {isSelected && (
          <Check size={14} className="text-muted-foreground shrink-0" />
        )}
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FontFamilyPicker() {
  const { setFloatingControl, trackItem } = useLayoutStore();
  const floatingRef = useRef<HTMLDivElement>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const {
    visibleItems,
    loading,
    error,
    filteredCount,
    hasMore,
    loadMore,
    search,
    setSearch,
    category,
    setCategory,
    availableCategories,
  } = useGoogleFonts();

  const compactFonts = useDataState((state) => state.compactFonts);
  const selectedFamily = compactFonts.find(
    (f) => f.default.postScriptName === trackItem?.details?.fontFamily
  )?.family;

  const handleSelectFont = async (family: string) => {
    if (!trackItem) return;

    const item = visibleItems.find((item) => item.family === family) ?? {
      family,
      category: "sans-serif",
      subsets: [],
      tags: [],
      variants: [{ variant: "regular", url: "" }],
    };

    const styles = itemToFonts(item);
    const defaultFont = getDefaultFont(item);

    const { fonts, compactFonts, setFonts, setCompactFonts } = useDataState.getState();

    if (!fonts.some((f) => f.postScriptName === defaultFont.postScriptName)) {
      setFonts([...fonts, ...styles]);
    }
    if (!compactFonts.some((f) => f.family === item.family)) {
      setCompactFonts([...compactFonts, { family: item.family, styles, default: defaultFont }]);
    }

    await applyFont(defaultFont, trackItem);
  };

  const selectedCategoryLabel =
    category ? (CATEGORY_LABELS[category] ?? category) : "All";

  // useClickOutside(floatingRef as React.RefObject<HTMLElement>, () =>
  //   setFloatingControl("")
  // );
  return (
    <div
      ref={floatingRef}
      className="w-xs bg-card border flex flex-col rounded-lg"
    >
      {/* Header */}
      <div className="handle flex cursor-grab justify-between items-center p-4">
        <p className="text-sm font-semibold">Fonts</p>
        <X
          className="h-4 w-4 cursor-pointer text-muted-foreground"
          onClick={() => setFloatingControl("")}
        />
      </div>

      {/* Search */}
      <div className="relative px-4">
        <SearchIcon className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search fonts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category filter */}
      {availableCategories.length > 0 && (
        <div className="px-4 mt-3">
          <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
            <PopoverTrigger asChild>
              <Button
                className="flex w-full items-center justify-between text-sm"
                variant="outline"
              >
                <div className="w-full overflow-hidden text-left">
                  <p className="truncate">{selectedCategoryLabel}</p>
                </div>
                <ChevronDown className="text-muted-foreground" size={14} />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              className="z-[200] p-0"
              style={{ width: "var(--radix-popover-trigger-width)" }}
            >
              {/* "All" option */}
              <div
                onClick={() => {
                  setCategory(null);
                  setCategoryOpen(false);
                }}
                className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
              >
                All
                {category === null && (
                  <Check size={14} className="text-muted-foreground" />
                )}
              </div>

              {availableCategories.map((cat) => (
                <div
                  key={cat}
                  onClick={() => {
                    setCategory(cat);
                    setCategoryOpen(false);
                  }}
                  className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/50"
                >
                  {CATEGORY_LABELS[cat] ?? cat}
                  {cat === category && (
                    <Check size={14} className="text-muted-foreground" />
                  )}
                </div>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* List */}
      <ScrollArea className="h-[400px] w-full px-4 mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading fonts...</span>
          </div>
        ) : error ? (
          <p className="py-4 text-center text-sm text-red-500">{error}</p>
        ) : visibleItems.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No fonts found
          </p>
        ) : (
          <>
            {visibleItems.map((item) => (
              <FontPreviewRow
                key={item.family}
                family={item.family}
                isSelected={item.family === selectedFamily}
                onClick={() => handleSelectFont(item.family)}
              />
            ))}

            {hasMore && (
              <div className="flex justify-center py-4">
                <Button size="sm" variant="outline" onClick={loadMore}>
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
}