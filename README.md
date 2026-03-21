# macOS Session Replay

Session replay for macOS desktop apps. Captures the screen, encodes to H.265 video chunks via hardware-accelerated ffmpeg, and uploads to cloud storage.

Think [PostHog Session Replay](https://posthog.com/session-replay) or [FullStory](https://www.fullstory.com/), but for native macOS apps.

https://github.com/user-attachments/assets/bbbd214a-5eaa-4856-876d-24f10b20ce3b

## How it works

```
5 FPS capture (ScreenCaptureKit)
  → H.265 encoding (ffmpeg + hevc_videotoolbox hardware encoder)
  → 60-second MP4 chunks
  → Upload to GCS via signed URLs
  → Delete local after confirmed upload
```

## Usage

```swift
// Package.swift
.package(url: "https://github.com/m13v/macos-session-replay.git", from: "0.1.0")

// Target dependency
.product(name: "SessionReplay", package: "macos-session-replay")
```

```swift
import SessionReplay

let config = SessionRecorder.Configuration(
    framesPerSecond: 5.0,
    chunkDurationSeconds: 60.0,
    ffmpegPath: "/opt/homebrew/bin/ffmpeg",  // or bundled path
    storageBaseURL: sessionRecordingsDir,
    deviceId: "device-uuid",
    backendURL: "https://your-backend.com",
    backendSecret: "your-secret"
)

let recorder = SessionRecorder(configuration: config)
try await recorder.start()

// Later...
await recorder.stop()
```

## Backend

The client needs a backend endpoint that generates GCS V4 signed URLs for chunk uploads.

**Endpoint:** `POST /api/session-recording/get-upload-url`

See [`Examples/backend-template.rs`](Examples/backend-template.rs) for a complete Rust/Axum reference implementation.

### GCS bucket setup

```bash
# Create bucket
gsutil mb -l us-east1 gs://your-session-recordings

# Auto-delete after 30 days
echo '{"rule":[{"action":{"type":"Delete"},"condition":{"age":30}}]}' | \
  gsutil lifecycle set /dev/stdin gs://your-session-recordings

# Grant upload permission to your service account
gsutil iam ch serviceAccount:your-sa@project.iam.gserviceaccount.com:objectCreator \
  gs://your-session-recordings
```

### GCS bucket structure

```
gs://your-session-recordings/
  {device_id}/
    {session_id}/
      chunk_0000.mp4
      chunk_0001.mp4
      ...
```

## Architecture

| Component | Description |
|-----------|-------------|
| `SessionRecorder` | Main orchestrator — timer, capture, encode, upload |
| `ScreenCaptureService` | Full display capture via ScreenCaptureKit |
| `VideoChunkEncoder` | Actor-based ffmpeg H.265 encoding |
| `ChunkUploader` | Uploads to GCS, retries with exponential backoff |
| `ChunkStorage` | Local file management, cleanup after upload |
| `PowerMonitor` | Pauses on battery power |

## Requirements

- macOS 14.0+
- Screen Recording permission
- ffmpeg with `hevc_videotoolbox` support (bundled or system)
- Swift 5.9+

## Resource usage

At 5 FPS with H.265 hardware encoding:
- **CPU**: Minimal (hardware encoder via VideoToolbox)
- **Storage**: ~2-5 MB/min (deleted after upload)
- **Upload**: ~120-300 MB/hour
- **Memory**: ~50-100 MB

## License

MIT
