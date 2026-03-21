import { NextResponse } from "next/server";
import { listAllRecordings } from "@/lib/gcs";
import { getFazmAuth } from "@/lib/fazm-firebase";

export const maxDuration = 300;

export async function GET() {
  try {
    const devices = await listAllRecordings();

    // Resolve Firebase UIDs to emails via fazm-prod Firebase Auth
    const auth = getFazmAuth();
    const labelMap: Record<string, string> = {};

    // Firebase UIDs are short alphanumeric strings (not UUID format with dashes)
    const firebaseUids = devices
      .map((d) => d.deviceId)
      .filter((id) => !id.includes("-") && id !== "unknown");

    if (firebaseUids.length > 0) {
      try {
        const { users } = await auth.getUsers(
          firebaseUids.map((uid) => ({ uid }))
        );
        for (const user of users) {
          labelMap[user.uid] = user.email || user.displayName || user.uid;
        }
      } catch (err) {
        console.error("Failed to resolve Firebase UIDs:", err);
      }
    }

    return NextResponse.json({ devices, labelMap });
  } catch (error) {
    console.error("Session recordings API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to list recordings",
      },
      { status: 500 }
    );
  }
}
