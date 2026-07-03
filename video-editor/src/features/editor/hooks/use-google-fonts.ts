import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchAllFontItems, GoogleFontApiItem } from "../utils/fetch-google-fonts";

const PAGE_SIZE = 25;

export type FontCategory = "sans-serif" | "serif" | "display" | "handwriting" | "monospace";

interface UseGoogleFontsOptions {
  initialCategory?: FontCategory | null;
}

interface UseGoogleFontsReturn {
  /** Visible items for the current page (respects search + category filter) */
  visibleItems: GoogleFontApiItem[];
  loading: boolean;
  error: string | null;
  /** Total filtered count (for "X fonts" label if needed) */
  filteredCount: number;
  hasMore: boolean;
  loadMore: () => void;
  search: string;
  setSearch: (q: string) => void;
  category: FontCategory | null;
  setCategory: (c: FontCategory | null) => void;
  /** All unique categories present in the full list */
  availableCategories: FontCategory[];
}

export const useGoogleFonts = (
  options: UseGoogleFontsOptions = {}
): UseGoogleFontsReturn => {
  const [allItems, setAllItems] = useState<GoogleFontApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearchRaw] = useState("");
  const [category, setCategory] = useState<FontCategory | null>(
    options.initialCategory ?? null
  );
  const [page, setPage] = useState(1);

  // Reset page whenever the filter changes
  const setSearch = useCallback((q: string) => {
    setSearchRaw(q);
    setPage(1);
  }, []);

  const setCategoryAndReset = useCallback((c: FontCategory | null) => {
    setCategory(c);
    setPage(1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAllFontItems()
      .then((items) => {
        if (!cancelled) {
          setAllItems(items);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? "Failed to load fonts");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (item.family.toLowerCase().includes("material icons")) return false;

      const matchesSearch =
        !q ||
        item.family.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q));

      const matchesCategory = !category || item.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [allItems, search, category]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, page * PAGE_SIZE),
    [filteredItems, page]
  );

  const availableCategories = useMemo(() => {
    const cats = new Set(allItems.map((item) => item.category as FontCategory));
    return Array.from(cats).sort();
  }, [allItems]);

  const hasMore = visibleItems.length < filteredItems.length;

  const loadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  return {
    visibleItems,
    loading,
    error,
    filteredCount: filteredItems.length,
    hasMore,
    loadMore,
    search,
    setSearch,
    category,
    setCategory: setCategoryAndReset,
    availableCategories
  };
};