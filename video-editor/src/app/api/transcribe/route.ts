// app/api/transcribe/route.ts

import { NextRequest, NextResponse } from "next/server";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { getVideoUploadPolicy } from "@/lib/upload-policy";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return NextResponse.json({ message: "Sign in to generate captions." }, { status: 401 });
  try {
    const policy = await getVideoUploadPolicy(session.userId);
    if (policy.plan === "Free") return NextResponse.json({ message: "Upgrade to Premium or Business to generate captions.", upgradeUrl: policy.upgradeUrl }, { status: 403 });
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
