import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getViewedChunks, initializeDatabase } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initializeDatabase();
    const viewedChunks = await getViewedChunks(userId);
    return NextResponse.json({ viewedChunks });
  } catch (error) {
    console.error("Get viewed chunks error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get viewed chunks" },
      { status: 500 }
    );
  }
}
