import { NextRequest, NextResponse } from "next/server";
import { getSignedUrl } from "@/lib/gcs";

export async function GET(request: NextRequest) {
  const objectPath = request.nextUrl.searchParams.get("path");
  if (!objectPath) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  // Basic validation — only allow mp4 files from the recordings bucket
  if (!objectPath.endsWith(".mp4") || objectPath.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const url = await getSignedUrl(objectPath);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Signed URL error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate signed URL" },
      { status: 500 }
    );
  }
}
