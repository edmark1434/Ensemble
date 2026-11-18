import { NextRequest, NextResponse } from "next/server";

const GOOGLE_FONTS_API_URL = "https://www.googleapis.com/webfonts/v1/webfonts";
const catalogLifetime = 86_400_000;
const catalogs = new Map<string, { json: string; fetchedAt: number }>();

function catalogResponse(json: string, stale = false) {
  return new NextResponse(json, { headers: {
    "Content-Type": "application/json",
    "Cache-Control": stale ? "public, max-age=60" : "public, max-age=86400, stale-while-revalidate=3600",
  } });
}

interface GoogleFontTag {
  name?: string;
  tag?: string;
  weight: number;
}

interface GoogleFontItem {
  family: string;
  variants: string[];
  subsets: string[];
  category: string;
  files: Record<string, string>;
  tags?: GoogleFontTag[];
}

interface GoogleFontsResponse {
  items: GoogleFontItem[];
}

const toHttps = (url: string) => url.replace(/^http:\/\//, "https://");

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedSort = searchParams.get("sort") || "popularity";
  const sort = ["alpha", "date", "popularity", "style", "trending"].includes(requestedSort)
    ? requestedSort : "popularity";

  const apiKey = process.env.GOOGLE_FONTS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Fonts API key not configured" },
      { status: 500 }
    );
  }

  const cached = catalogs.get(sort);
  if (cached && Date.now() - cached.fetchedAt < catalogLifetime) return catalogResponse(cached.json);

  try {
    const url = new URL(GOOGLE_FONTS_API_URL);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("sort", sort);

    const fetchCatalog = () => fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    let response = await fetchCatalog();
    if ([502, 503, 504].includes(response.status)) {
      await response.body?.cancel();
      await new Promise(resolve => setTimeout(resolve, 300));
      response = await fetchCatalog();
    }

    if (!response.ok) {
      console.warn("Google Fonts catalog unavailable", { status: response.status });
      if (cached && response.status >= 500) return catalogResponse(cached.json, true);
      return NextResponse.json({ error: "Google Fonts is temporarily unavailable." }, { status: 502 });
    }

    const data: GoogleFontsResponse = await response.json();

    const transformed = data.items.map((item) => ({
      family: item.family,
      category: item.category,
      subsets: item.subsets,
      tags: (item.tags ?? []).map((t) => t.name ?? t.tag ?? "").filter(Boolean),
      variants: Object.entries(item.files).map(([variant, fileUrl]) => ({
        variant,
        url: toHttps(fileUrl)
      }))
    }));

    const json = JSON.stringify({ items: transformed });
    catalogs.set(sort, { json, fetchedAt: Date.now() });
    return catalogResponse(json);
  } catch {
    if (cached) return catalogResponse(cached.json, true);
    console.warn("Google Fonts catalog request failed");
    return NextResponse.json(
      { error: "Failed to fetch fonts from Google Fonts" },
      { status: 502 }
    );
  }
}
