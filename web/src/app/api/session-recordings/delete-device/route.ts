import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initializeDatabase, deleteDeviceViewedRecords } from "@/lib/db";
import { deleteDeviceRecordings } from "@/lib/gcs";

export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { deviceId } = await request.json();
    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
    }

    await initializeDatabase();

    // Delete GCS files and DB records in parallel
    const [deletedFiles, deletedRecords] = await Promise.all([
      deleteDeviceRecordings(deviceId),
      deleteDeviceViewedRecords(deviceId),
    ]);

    return NextResponse.json({
      ok: true,
      deletedFiles,
      deletedRecords,
    });
  } catch (error) {
    console.error("Delete device recordings error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete device recordings" },
      { status: 500 }
    );
  }
}
