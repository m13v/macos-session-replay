import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initializeDatabase } from "@/lib/db";
import { neon } from "@neondatabase/serverless";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initializeDatabase();
    const { chunks } = await request.json();
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return NextResponse.json({ error: "Missing chunks array" }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Insert all chunks in a single query using unnest
    await sql`
      INSERT INTO session_replay_views (user_id, device_id, session_id, chunk_name)
      SELECT
        ${userId},
        split_part(c, '/', 1),
        split_part(c, '/', 2),
        c
      FROM unnest(${chunks}::text[]) AS c
      ON CONFLICT (user_id, chunk_name) DO NOTHING
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Mark all viewed error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark all viewed" },
      { status: 500 }
    );
  }
}
