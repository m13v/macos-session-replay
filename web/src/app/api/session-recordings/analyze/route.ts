import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { downloadChunk, listAllRecordings } from "@/lib/gcs";
import { analyzeVideoChunks } from "@/lib/gemini";

const MAX_CHUNKS = 60; // ~60 minutes of video
const MAX_CHUNK_SIZE = 20 * 1024 * 1024; // 20MB per chunk

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { deviceId, sessionId, prompt, chunkNames } = body as {
    deviceId: string;
    sessionId?: string;
    prompt?: string;
    chunkNames?: string[];
  };

  if (!deviceId) {
    return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  }

  const analysisPrompt =
    prompt ||
    `You are watching ~60 minutes of a user's session recording. Your job is to identify the ONE most impactful task an AI agent could take off their plate.

With this much context, you should almost always find something. Only return NO_TASK if the user is genuinely idle or doing something an AI agent cannot help with at all.

The AI agent has: shell access, Claude Code, native browser control, full file system access, and can execute any task on the user's computer.

Only flag a task if ALL of these are true:
- The task is concrete and completable (not vague like "help debug" or "improve code")
- An AI agent could realistically do it 5x faster than the user
- The AI agent's known weaknesses (slower at visual tasks, can't do real-time interaction) won't make it slower

AI agents are FASTER at: bulk text processing, searching codebases, running shell commands, filling forms with known data, writing boilerplate code, data transformation, file operations across many files, research, lookups.
AI agents are SLOWER at: browsing casually, visual inspection, creative decisions, real-time human judgment.

Respond in this exact format:

VERDICT: NO_TASK or TASK_FOUND
TASK: (only if TASK_FOUND) One sentence: what the user is trying to accomplish overall, and one concrete action the agent would take to help.
CONFIDENCE: (only if TASK_FOUND) How confident this saves 5x time (low/medium/high)`;

  try {
    let chunksToAnalyze: string[] = [];

    if (chunkNames && chunkNames.length > 0) {
      // Use explicitly provided chunk names
      chunksToAnalyze = chunkNames.slice(0, MAX_CHUNKS);
    } else {
      // Find chunks from GCS listing
      const allRecordings = await listAllRecordings();
      const device = allRecordings.find((d) => d.deviceId === deviceId);
      if (!device) {
        return NextResponse.json({ error: "Device not found" }, { status: 404 });
      }

      const sessions = sessionId
        ? device.sessions.filter((s) => s.sessionId === sessionId)
        : device.sessions;

      if (sessions.length === 0) {
        return NextResponse.json({ error: "No sessions found" }, { status: 404 });
      }

      // Collect chunk names, most recent first, respecting size limits
      for (const session of sessions) {
        for (const chunk of session.chunks) {
          if (chunk.size > MAX_CHUNK_SIZE) {
            console.log(`[Analyze] Skipping oversized chunk: ${chunk.name} (${chunk.size} bytes)`);
            continue;
          }
          chunksToAnalyze.push(chunk.name);
          if (chunksToAnalyze.length >= MAX_CHUNKS) break;
        }
        if (chunksToAnalyze.length >= MAX_CHUNKS) break;
      }
    }

    if (chunksToAnalyze.length === 0) {
      return NextResponse.json({ error: "No suitable chunks found for analysis" }, { status: 404 });
    }

    console.log(`[Analyze] Downloading ${chunksToAnalyze.length} chunks for analysis...`);

    // Download chunks in parallel
    const downloadedChunks = await Promise.all(
      chunksToAnalyze.map(async (name) => {
        const buffer = await downloadChunk(name);
        console.log(`[Analyze] Downloaded ${name} (${buffer.length} bytes)`);
        return { buffer, name };
      })
    );

    console.log(`[Analyze] Sending ${downloadedChunks.length} chunks to Gemini...`);

    const result = await analyzeVideoChunks(downloadedChunks, analysisPrompt);

    return NextResponse.json({
      success: true,
      deviceId,
      sessionId: sessionId || "all",
      chunksAnalyzed: result.chunksAnalyzed,
      chunkNames: chunksToAnalyze,
      model: result.model,
      analysis: result.analysis,
    });
  } catch (error) {
    console.error("[Analyze] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
