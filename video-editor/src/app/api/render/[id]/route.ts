// app/api/render/[id]/route.ts

import { NextResponse } from "next/server";

const RENDER_SERVER_URL = process.env.RENDER_SERVER_URL || "http://localhost:3001";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get("x-user-id");

    if (!id) {
      return NextResponse.json(
        { message: "id parameter is required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${RENDER_SERVER_URL}/renders/${id}`, {
      cache: "no-store",
      headers: userId ? { "x-user-id": userId } : undefined,
    });

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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get("x-user-id");

    if (!id) {
      return NextResponse.json(
        { message: "id parameter is required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${RENDER_SERVER_URL}/renders/${id}`, {
      method: "DELETE",
      headers: userId ? { "x-user-id": userId } : undefined,
    });

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