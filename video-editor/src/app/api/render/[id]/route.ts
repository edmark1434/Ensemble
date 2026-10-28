// app/api/render/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";

const RENDER_SERVER_URL = process.env.RENDER_SERVER_URL || "http://localhost:3001";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
    const session = token ? await verifyEditorSession(token) : null;
    if (!session) return NextResponse.json({ message: "Sign in to continue." }, { status: 401 });
    const userId = session.userId;

    if (!id) {
      return NextResponse.json(
        { message: "id parameter is required" },
        { status: 400 }
      );
    }

    let response: Response;
    try {
      response = await fetch(`${RENDER_SERVER_URL}/renders/${id}`, {
        cache: "no-store",
        headers: userId ? { "x-user-id": userId } : undefined,
      });
    } catch {
      // Render server isn't reachable — nothing to report, not a bug
      return NextResponse.json({ error: "Render server unavailable" }, { status: 503 });
    }

    const statusData = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: statusData?.message || "Failed to get render status" },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
    const session = token ? await verifyEditorSession(token) : null;
    if (!session) return NextResponse.json({ message: "Sign in to continue." }, { status: 401 });
    const userId = session.userId;

    if (!id) {
      return NextResponse.json(
        { message: "id parameter is required" },
        { status: 400 }
      );
    }

    let response: Response;
    try {
      response = await fetch(`${RENDER_SERVER_URL}/renders/${id}`, {
        method: "DELETE",
        headers: userId ? { "x-user-id": userId } : undefined,
      });
    } catch {
      return NextResponse.json({ error: "Render server unavailable" }, { status: 503 });
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || "Failed to cancel render job" },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}