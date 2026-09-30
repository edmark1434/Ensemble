// app/api/transcribe/[id]/route.ts

import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { Authorization: process.env.ASSEMBLYAI_API_KEY! }
    });
    const transcript = await res.json();

    if (transcript.status === "error") {
      return NextResponse.json({ status: "error", message: transcript.error }, { status: 200 });
    }
    if (transcript.status !== "completed") {
      return NextResponse.json({ status: "processing" }, { status: 200 });
    }
    if (!transcript.words || transcript.words.length === 0) {
      return NextResponse.json({ status: "empty" }, { status: 200 });
    }

    const shaped = {
      results: {
        main: {
          words: transcript.words.map((w: any) => ({
            word: w.text,
            start: w.start / 1000,
            end: w.end / 1000,
            confidence: w.confidence
          }))
        }
      }
    };
    return NextResponse.json({ status: "completed", data: shaped }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}