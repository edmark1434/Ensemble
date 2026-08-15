// app/api/render/mine/route.ts

import { NextResponse } from "next/server";

const RENDER_SERVER_URL = process.env.RENDER_SERVER_URL || "http://localhost:3001";

export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");

    let response: Response;
    try {
      response = await fetch(`${RENDER_SERVER_URL}/renders/mine`, {
        cache: "no-store",
        headers: userId ? { "x-user-id": userId } : undefined,
      });
    } catch {
      // Render server isn't reachable — client already treats non-ok as "no job"
      return NextResponse.json({ error: "Render server unavailable" }, { status: 503 });
    }

    const statusData = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: statusData?.message || "No active render" },
        { status: response.status }
      );
    }

    return NextResponse.json(statusData, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}