// app/api/render/route.ts

import { NextResponse } from "next/server";

const RENDER_SERVER_URL = process.env.RENDER_SERVER_URL || "http://localhost:3001";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = request.headers.get("x-user-id");

    const response = await fetch(`${RENDER_SERVER_URL}/renders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userId ? { "x-user-id": userId } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { message: error?.message || "Failed to create render job", issues: error?.issues },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
