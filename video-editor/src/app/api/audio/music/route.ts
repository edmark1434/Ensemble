import { NextRequest, NextResponse } from "next/server";

const FREESOUND_API_BASE_URL = "https://freesound.org/apiv2";

interface FreesoundTrack {
    id: number;
    name: string;
    duration: number;
    previews: {
        "preview-hq-mp3": string;
        "preview-lq-mp3": string;
    };
    description: string;
    tags: string[];
    username: string;
    license: string;
}

interface FreesoundSearchResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: FreesoundTrack[];
}

export async function POST(request: NextRequest) {
    const apiKey = process.env.FREESOUND_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: "Freesound API key not configured" },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const { limit = 30, page = 1, query = {} } = body;

        // Extract search term from query.keys array (matches your existing shape)
        const searchTerm = query?.keys?.[0] || "";

        let url: string;

        if (searchTerm) {
            url = `${FREESOUND_API_BASE_URL}/search/text/?query=${encodeURIComponent(searchTerm)}&page=${page}&page_size=${limit}&fields=id,name,duration,previews,description,tags,username,license&token=${apiKey}`;
        } else {
            // No query — load popular/random sounds
            url = `${FREESOUND_API_BASE_URL}/search/text/?query=music&page=${page}&page_size=${limit}&fields=id,name,duration,previews,description,tags,username,license&filter=duration:[30 TO 300]&sort=rating_desc&token=${apiKey}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Freesound API error: ${response.status}`);
        }

        const data: FreesoundSearchResponse = await response.json();

        // Transform to match your existing shape that Audios.tsx expects
        const mappedMusics = data.results.map((track) => ({
            id: `freesound_${track.id}`,
            src: track.previews["preview-hq-mp3"],
            name: track.name,
            type: "audio",
            description: track.username,
            duration: track.duration,
            metadata: {
                tags: track.tags,
                license: track.license,
                freesound_id: track.id
            }
        }));

        return NextResponse.json({
            musics: mappedMusics,
            pagination: {
                hasMore: !!data.next,
                total: data.count,
                page,
                limit
            }
        });
    } catch (error) {
        console.error("Freesound API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch audio from Freesound" },
            { status: 500 }
        );
    }
}