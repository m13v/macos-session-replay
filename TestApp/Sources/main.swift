import Foundation
import SessionReplay

// Simple test: capture screen for 10 seconds at 5 FPS, encode to H.265 chunks
// No upload — just verify capture + encoding works locally

@main
struct TestApp {
    static func main() async throws {
        print("=== macOS Session Replay Test ===")
        print("")

        // 1. Check screen recording permission
        let hasPermission = ScreenCaptureService.checkPermission()
        print("Screen recording permission: \(hasPermission ? "GRANTED" : "DENIED")")
        if !hasPermission {
            print("Please grant Screen Recording permission in System Settings > Privacy & Security")
            ScreenCaptureService.requestPermission()
            print("Waiting 10 seconds for permission grant...")
            try await Task.sleep(nanoseconds: 10_000_000_000)

            if !ScreenCaptureService.checkPermission() {
                print("ERROR: Still no permission. Exiting.")
                return
            }
        }

        // 2. Find ffmpeg
        let ffmpegPaths = [
            "/opt/homebrew/bin/ffmpeg",
            "/usr/local/bin/ffmpeg",
            "/usr/bin/ffmpeg",
        ]
        guard let ffmpegPath = ffmpegPaths.first(where: { FileManager.default.fileExists(atPath: $0) }) else {
            print("ERROR: ffmpeg not found. Install with: brew install ffmpeg")
            return
        }
        print("Using ffmpeg: \(ffmpegPath)")

        // 3. Set up storage
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("session-replay-test-\(UUID().uuidString.prefix(8))")
        print("Storage dir: \(tempDir.path)")

        // 4. Configure recorder (short chunk for testing)
        let config = SessionRecorder.Configuration(
            framesPerSecond: 5.0,
            chunkDurationSeconds: 10.0,  // Short chunks for testing
            ffmpegPath: ffmpegPath,
            storageBaseURL: tempDir,
            deviceId: "test-device",
            backendURL: "http://localhost:8080",  // Not used — upload will fail gracefully
            backendSecret: "test-secret"
        )

        let recorder = SessionRecorder(configuration: config)

        // 5. Start recording
        print("")
        print("Starting capture at 5 FPS for 15 seconds...")
        print("(switch between apps to test aspect ratio handling)")
        print("")

        try await recorder.start()

        let status1 = await recorder.getStatus()
        print("Recording: \(status1.isRecording), Session: \(status1.sessionId ?? "none")")

        // 6. Wait and show progress
        for i in 1...15 {
            try await Task.sleep(nanoseconds: 1_000_000_000)
            let status = await recorder.getStatus()
            print("  [\(i)s] frames: \(status.frameCount), pending uploads: \(status.pendingUploads)")
        }

        // 7. Stop recording
        print("")
        print("Stopping recorder...")
        await recorder.stop()

        let finalStatus = await recorder.getStatus()
        print("Final: frames=\(finalStatus.frameCount), pending=\(finalStatus.pendingUploads)")

        // 8. Check what was created
        print("")
        print("=== Output Files ===")
        let enumerator = FileManager.default.enumerator(
            at: tempDir,
            includingPropertiesForKeys: [.fileSizeKey],
            options: .skipsHiddenFiles
        )
        var totalSize: Int64 = 0
        var fileCount = 0
        while let fileURL = enumerator?.nextObject() as? URL {
            if fileURL.pathExtension == "mp4" {
                let size = (try? fileURL.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
                let relativePath = fileURL.path.replacingOccurrences(of: tempDir.path + "/", with: "")
                print("  \(relativePath) (\(ByteCountFormatter.string(fromByteCount: Int64(size), countStyle: .file)))")
                totalSize += Int64(size)
                fileCount += 1
            }
        }

        if fileCount == 0 {
            print("  (no MP4 files created — check ffmpeg and permissions)")
        } else {
            print("")
            print("Total: \(fileCount) chunk(s), \(ByteCountFormatter.string(fromByteCount: totalSize, countStyle: .file))")
        }

        print("")
        print("Files at: \(tempDir.path)")
        print("Play with: open \(tempDir.path)")
        print("")
        print("=== Test Complete ===")
    }
}
