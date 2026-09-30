// app/api/transcribe/route.ts

import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    const submitRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        Authorization: process.env.ASSEMBLYAI_API_KEY!,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ audio_url: url })
    });
    const data = await submitRes.json();
    if (!submitRes.ok || !data.id) {
      return NextResponse.json(
        { message: data.error || "Failed to start transcription." },
        { status: 502 }
      );
    }
    return NextResponse.json({ id: data.id }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}