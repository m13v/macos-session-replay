// Gemini API client for video analysis

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const VIDEO_MODEL = "gemini-pro-latest";
const INLINE_SIZE_LIMIT = 1.5 * 1024 * 1024; // Use inline base64 for chunks under 1.5MB

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return key;
}

export interface VideoAnalysisResult {
  analysis: string;
  chunksAnalyzed: number;
  model: string;
}

/**
 * Upload a video buffer to Gemini's File API for multimodal analysis.
 */
async function uploadToGeminiFileApi(
  videoBuffer: Buffer,
  displayName: string
): Promise<{ name: string; uri: string }> {
  const apiKey = getApiKey();

  // Start resumable upload
  const startRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(videoBuffer.length),
        "X-Goog-Upload-Header-Content-Type": "video/mp4",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { displayName } }),
    }
  );

  if (!startRes.ok) {
    const err = await startRes.text();
    throw new Error(`Gemini File API start failed: ${startRes.status} ${err}`);
  }

  const uploadUrl = startRes.headers.get("X-Goog-Upload-URL");
  if (!uploadUrl) throw new Error("No upload URL from Gemini File API");

  // Upload bytes
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Length": String(videoBuffer.length),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: new Uint8Array(videoBuffer),
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Gemini File API upload failed: ${uploadRes.status} ${err}`);
  }

  const result = await uploadRes.json();
  console.log(`[Gemini] Uploaded: ${result.file.name} (${result.file.state})`);
  return { name: result.file.name, uri: result.file.uri };
}

/**
 * Wait for a Gemini file to finish processing (state = ACTIVE).
 */
async function waitForFileProcessing(fileName: string, maxWaitMs = 120_000): Promise<void> {
  const apiKey = getApiKey();
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`
    );
    if (!res.ok) throw new Error(`File status check failed: ${res.status}`);
    const file = await res.json();
    if (file.state === "ACTIVE") return;
    if (file.state === "FAILED") throw new Error(`File processing failed: ${fileName}`);
    console.log(`[Gemini] File ${fileName}: ${file.state}, waiting...`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`File processing timed out: ${fileName}`);
}

/**
 * Delete a file from the Gemini File API (fire-and-forget).
 */
function deleteGeminiFile(fileName: string): void {
  const apiKey = getApiKey();
  fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`, {
    method: "DELETE",
  }).catch((err) => console.warn(`[Gemini] Cleanup failed for ${fileName}:`, err));
}

/**
 * Analyze session recording video chunks with Gemini Pro Latest.
 * Small chunks use inline base64; large chunks use the File API.
 */
export async function analyzeVideoChunks(
  chunks: { buffer: Buffer; name: string }[],
  prompt: string
): Promise<VideoAnalysisResult> {
  const uploadedFiles: string[] = []; // track for cleanup
  const parts: Record<string, unknown>[] = [];

  try {
    for (const chunk of chunks) {
      if (chunk.buffer.length <= INLINE_SIZE_LIMIT) {
        // Small chunk: inline base64
        parts.push({
          inlineData: {
            mimeType: "video/mp4",
            data: chunk.buffer.toString("base64"),
          },
        });
        console.log(`[Gemini] Inline chunk: ${chunk.name} (${(chunk.buffer.length / 1024).toFixed(0)}KB)`);
      } else {
        // Large chunk: upload via File API
        console.log(`[Gemini] Uploading chunk: ${chunk.name} (${(chunk.buffer.length / 1024 / 1024).toFixed(1)}MB)`);
        const file = await uploadToGeminiFileApi(chunk.buffer, chunk.name);
        uploadedFiles.push(file.name);
        await waitForFileProcessing(file.name);
        parts.push({
          fileData: { fileUri: file.uri, mimeType: "video/mp4" },
        });
      }
    }

    parts.push({ text: prompt });

    const apiKey = getApiKey();
    const url = `${GEMINI_API_URL}/${VIDEO_MODEL}:generateContent?key=${apiKey}`;

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`[Gemini] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 8192,
            },
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error(`[Gemini] API error (attempt ${attempt + 1}):`, response.status);
          if (response.status === 429 || response.status >= 500) {
            lastError = new Error(`Gemini API error: ${response.status}`);
            continue;
          }
          throw new Error(`Gemini video analysis error: ${response.status} ${error}`);
        }

        const data = await response.json();
        console.log("[Gemini] Video analysis usage:", JSON.stringify(data.usageMetadata));

        const finishReason = data.candidates?.[0]?.finishReason;
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (finishReason === "SAFETY") {
          lastError = new Error("Blocked by safety filters");
          continue;
        }

        if (!generatedText) {
          lastError = new Error(`No output. Finish reason: ${finishReason}`);
          continue;
        }

        return {
          analysis: generatedText.trim(),
          chunksAnalyzed: chunks.length,
          model: VIDEO_MODEL,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError || new Error("Failed to analyze video after retries");
  } finally {
    // Clean up uploaded files
    for (const name of uploadedFiles) deleteGeminiFile(name);
  }
}
