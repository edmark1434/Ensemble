// app/api/transcribe/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    // Submit for transcription
    const submitRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        Authorization: process.env.ASSEMBLYAI_API_KEY!,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ audio_url: url, word_boost: [] })
    });

    const { id } = await submitRes.json();

    // Poll until done
    let transcript;
    while (true) {
      const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: { Authorization: process.env.ASSEMBLYAI_API_KEY! }
      });
      transcript = await pollRes.json();
      if (transcript.status === "completed" || transcript.status === "error") break;
      await new Promise((r) => setTimeout(r, 2000));
    }

    if (transcript.status === "error") {
      return NextResponse.json({ message: transcript.error }, { status: 500 });
    }

    // Shape it to match what generateCaptions expects
    const shaped = {
      results: {
        main: {
          words: transcript.words.map((w: any) => ({
            word: w.text,
            start: w.start / 1000,  // AssemblyAI gives ms, generateCaptions wants seconds
            end: w.end / 1000,
            confidence: w.confidence
          }))
        }
      }
    };

    // Store shaped data somewhere accessible and return a URL to it
    // Simplest: return it directly and skip the fetchJsonFromUrl step
    return NextResponse.json({ transcribe: { data: shaped } }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}