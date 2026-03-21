import { getFirebaseAdmin } from "./firebase";

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || "fazm-session-recordings";

export interface SessionChunk {
  name: string; // full GCS object path
  size: number;
  updated: string; // ISO date
}

export interface Session {
  sessionId: string;
  chunks: SessionChunk[];
  firstChunk: string; // ISO date
  lastChunk: string; // ISO date
  totalSize: number;
  chunkCount: number;
}

export interface DeviceRecordings {
  deviceId: string;
  sessions: Session[];
  totalChunks: number;
  totalSize: number;
  lastActivity: string; // ISO date
}

function getBucket() {
  return getFirebaseAdmin().storage().bucket(BUCKET_NAME);
}

/**
 * List all session recordings grouped by device -> session.
 */
export async function listAllRecordings(): Promise<DeviceRecordings[]> {
  const bucket = getBucket();
  const [files] = await bucket.getFiles();

  // Group files by device/session
  const deviceMap = new Map<string, Map<string, SessionChunk[]>>();

  for (const file of files) {
    const parts = file.name.split("/");
    if (parts.length < 3 || !file.name.endsWith(".mp4")) continue;

    const deviceId = parts[0];
    const sessionId = parts[1];
    const chunk: SessionChunk = {
      name: file.name,
      size: parseInt(file.metadata.size as string, 10) || 0,
      updated: file.metadata.updated as string || new Date().toISOString(),
    };

    if (!deviceMap.has(deviceId)) deviceMap.set(deviceId, new Map());
    const sessionMap = deviceMap.get(deviceId)!;
    if (!sessionMap.has(sessionId)) sessionMap.set(sessionId, []);
    sessionMap.get(sessionId)!.push(chunk);
  }

  // Build structured result
  const devices: DeviceRecordings[] = [];

  for (const [deviceId, sessionMap] of deviceMap) {
    const sessions: Session[] = [];
    let deviceTotalChunks = 0;
    let deviceTotalSize = 0;

    for (const [sessionId, chunks] of sessionMap) {
      chunks.sort((a, b) => a.name.localeCompare(b.name));
      const totalSize = chunks.reduce((sum, c) => sum + c.size, 0);
      const dates = chunks.map((c) => c.updated).sort();

      sessions.push({
        sessionId,
        chunks,
        firstChunk: dates[0],
        lastChunk: dates[dates.length - 1],
        totalSize,
        chunkCount: chunks.length,
      });

      deviceTotalChunks += chunks.length;
      deviceTotalSize += totalSize;
    }

    sessions.sort((a, b) => b.lastChunk.localeCompare(a.lastChunk));

    devices.push({
      deviceId,
      sessions,
      totalChunks: deviceTotalChunks,
      totalSize: deviceTotalSize,
      lastActivity: sessions[0]?.lastChunk || "",
    });
  }

  devices.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  return devices;
}

/**
 * Delete all recordings for a specific device.
 */
export async function deleteDeviceRecordings(deviceId: string): Promise<number> {
  const bucket = getBucket();
  const [files] = await bucket.getFiles({ prefix: `${deviceId}/` });
  if (files.length === 0) return 0;
  await Promise.all(files.map((file) => file.delete()));
  return files.length;
}

/**
 * Download a chunk's contents as a Buffer.
 */
export async function downloadChunk(objectPath: string): Promise<Buffer> {
  const bucket = getBucket();
  const file = bucket.file(objectPath);
  const [contents] = await file.download();
  return contents;
}

/**
 * Generate a signed URL for a specific chunk (valid for 1 hour).
 */
export async function getSignedUrl(objectPath: string): Promise<string> {
  const bucket = getBucket();
  const file = bucket.file(objectPath);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });
  return url;
}
