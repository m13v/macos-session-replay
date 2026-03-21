import { neon } from "@neondatabase/serverless";

// Lazy initialization to avoid errors during build when DATABASE_URL is not set
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return neon(process.env.DATABASE_URL);
}

export async function initializeDatabase() {
  const sql = getDb();

  // Create session_replay_views table to track which chunks have been watched
  await sql`
    CREATE TABLE IF NOT EXISTS session_replay_views (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      chunk_name TEXT NOT NULL,
      viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, chunk_name)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_replay_views_user_device
    ON session_replay_views(user_id, device_id)
  `;

  console.log("[DB] Database initialized");
}

export async function markChunkViewed(
  userId: string,
  deviceId: string,
  sessionId: string,
  chunkName: string
) {
  const sql = getDb();
  await sql`
    INSERT INTO session_replay_views (user_id, device_id, session_id, chunk_name)
    VALUES (${userId}, ${deviceId}, ${sessionId}, ${chunkName})
    ON CONFLICT (user_id, chunk_name) DO NOTHING
  `;
}

export async function getViewedChunks(userId: string): Promise<string[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT chunk_name FROM session_replay_views WHERE user_id = ${userId}
  `;
  return rows.map((r: Record<string, unknown>) => r.chunk_name as string);
}

export async function deleteDeviceViewedRecords(deviceId: string): Promise<number> {
  const sql = getDb();
  const rows = await sql`
    DELETE FROM session_replay_views WHERE device_id = ${deviceId}
    RETURNING id
  `;
  return rows.length;
}
