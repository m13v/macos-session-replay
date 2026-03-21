import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { markChunkViewed, initializeDatabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initializeDatabase();
    const { deviceId, sessionId, chunkName } = await request.json();
    if (!deviceId || !sessionId || !chunkName) {
      return NextResponse.json(
        { error: "Missing deviceId, sessionId, or chunkName" },
        { status: 400 }
      );
    }

    await markChunkViewed(userId, deviceId, sessionId, chunkName);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Mark viewed error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark viewed" },
      { status: 500 }
    );
  }
}
