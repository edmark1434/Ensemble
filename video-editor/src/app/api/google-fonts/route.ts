import { NextRequest, NextResponse } from "next/server";

const GOOGLE_FONTS_API_URL = "https://www.googleapis.com/webfonts/v1/webfonts";

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
  const sort = searchParams.get("sort") || "popularity";

  const apiKey = process.env.GOOGLE_FONTS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Fonts API key not configured" },
      { status: 500 }
    );
  }

  try {
    const url = new URL(GOOGLE_FONTS_API_URL);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("sort", sort);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Google Fonts API error: ${response.status}`);
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

    return NextResponse.json(
      { items: transformed },
      {
        headers: {
          // Also cache in the browser for 24 h
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600"
        }
      }
    );
  } catch (error) {
    console.error("Google Fonts API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fonts from Google Fonts" },
      { status: 500 }
    );
  }
}