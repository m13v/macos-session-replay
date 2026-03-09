import AppKit
import CoreGraphics
import Darwin
import Foundation

/// Encodes screenshot frames into H.265 video chunks using ffmpeg for efficient storage.
/// Uses fragmented MP4 format so frames can be read while the file is still being written.
public actor VideoChunkEncoder {

    // MARK: - Configuration

    private let chunkDuration: TimeInterval
    private let frameRate: Double
    private let maxResolution: CGFloat = 3000
    private let ffmpegPath: String

    /// Threshold for aspect ratio change that triggers a new chunk (20% difference)
    private let aspectRatioChangeThreshold: CGFloat = 0.2

    /// Seconds the new aspect ratio must remain stable before switching chunks.
    private let aspectRatioStabilityDelay: TimeInterval = 2.0

    /// Maximum frames to buffer before forcing a flush (memory safety)
    private var maxBufferFrames: Int {
        Int(chunkDuration * frameRate) + 20
    }

    /// Maximum consecutive ffmpeg failures before emergency reset
    private let maxConsecutiveFailures = 5

    // MARK: - State

    private var frameTimestamps: [Date] = []
    private var consecutiveWriteFailures = 0
    private var pendingAspectRatioSize: CGSize?
    private var pendingAspectRatioSince: Date?
    private var currentChunkStartTime: Date?
    public private(set) var currentChunkPath: String?
    private var frameOffsetInChunk: Int = 0

    // FFmpeg process state
    private var ffmpegProcess: Process?
    private var ffmpegStdin: FileHandle?
    private var currentOutputSize: CGSize?
    private var currentChunkInputSize: CGSize?

    private var stalenessCheckTask: Task<Void, Never>?
    private var videosDirectory: URL?
    private var isInitialized = false

    /// Called when a chunk is finalized and ready for upload
    public var onChunkFinalized: ((String) -> Void)?

    // MARK: - Types

    public struct EncodedFrame: Sendable {
        public let videoChunkPath: String
        public let frameOffset: Int
        public let timestamp: Date
    }

    public struct ChunkFlushResult: Sendable {
        public let videoChunkPath: String
        public let frames: [EncodedFrame]
    }

    // MARK: - Initialization

    public init(frameRate: Double, chunkDuration: TimeInterval = 60.0, ffmpegPath: String) {
        self.frameRate = frameRate
        self.chunkDuration = chunkDuration
        self.ffmpegPath = ffmpegPath
    }

    /// Initialize the encoder with the videos directory
    public func initialize(videosDirectory: URL) async throws {
        guard !isInitialized else { return }

        self.videosDirectory = videosDirectory
        isInitialized = true
        log("VideoChunkEncoder: Initialized at \(videosDirectory.path)")
    }

    // MARK: - Frame Processing

    /// Add a frame to the buffer. Returns encoded info if this frame completed a chunk.
    public func addFrame(image: CGImage, timestamp: Date) async throws -> EncodedFrame? {
        guard isInitialized, let videosDir = videosDirectory else {
            throw ScreenRecordingError.notInitialized
        }

        let newFrameSize = CGSize(width: image.width, height: image.height)

        // SAFETY: Check if buffer exceeded max size
        if frameTimestamps.count >= maxBufferFrames {
            log("VideoChunkEncoder: Buffer exceeded \(maxBufferFrames) frames, forcing flush")
            try await emergencyReset()
        }

        // Check if aspect ratio changed significantly (with debounce)
        if let currentInputSize = currentChunkInputSize,
           hasSignificantAspectRatioChange(from: currentInputSize, to: newFrameSize) {
            let now = Date()
            let pendingMatches = pendingAspectRatioSize.map {
                !hasSignificantAspectRatioChange(from: $0, to: newFrameSize)
            } ?? false

            if pendingMatches,
               let since = pendingAspectRatioSince,
               now.timeIntervalSince(since) >= aspectRatioStabilityDelay {
                log("VideoChunkEncoder: Aspect ratio changed (\(currentInputSize) -> \(newFrameSize)), new chunk")
                pendingAspectRatioSize = nil
                pendingAspectRatioSince = nil
                try await finalizeCurrentChunk()
            } else {
                if !pendingMatches {
                    pendingAspectRatioSize = newFrameSize
                    pendingAspectRatioSince = now
                }
                return nil
            }
        } else {
            pendingAspectRatioSize = nil
            pendingAspectRatioSince = nil
        }

        // Start new chunk if needed
        if currentChunkStartTime == nil {
            currentChunkStartTime = timestamp
            currentChunkPath = generateChunkPath(for: timestamp)
            frameOffsetInChunk = 0
            currentChunkInputSize = newFrameSize

            do {
                try await startFFmpegProcess(
                    for: currentChunkPath!,
                    videosDir: videosDir,
                    imageSize: newFrameSize
                )
                consecutiveWriteFailures = 0
            } catch {
                consecutiveWriteFailures += 1
                logError("VideoChunkEncoder: Failed to start ffmpeg (\(consecutiveWriteFailures)/\(maxConsecutiveFailures))")

                if consecutiveWriteFailures >= maxConsecutiveFailures {
                    try await emergencyReset()
                }
                throw error
            }
        }

        frameTimestamps.append(timestamp)

        let frameInfo = EncodedFrame(
            videoChunkPath: currentChunkPath!,
            frameOffset: frameOffsetInChunk,
            timestamp: timestamp
        )

        frameOffsetInChunk += 1

        do {
            try await writeFrame(image: image)
            consecutiveWriteFailures = 0
            resetStalenessTimer()
        } catch {
            consecutiveWriteFailures += 1
            logError("VideoChunkEncoder: Failed to write frame (\(consecutiveWriteFailures)/\(maxConsecutiveFailures))")

            if consecutiveWriteFailures >= maxConsecutiveFailures {
                try await emergencyReset()
            }
            throw error
        }

        // Check if chunk duration exceeded
        if let startTime = currentChunkStartTime,
           timestamp.timeIntervalSince(startTime) >= chunkDuration {
            try await finalizeCurrentChunk()
            return frameInfo
        }

        return frameInfo
    }

    /// Force flush current buffer (app termination, etc.)
    public func flushCurrentChunk() async throws -> ChunkFlushResult? {
        guard currentChunkPath != nil, !frameTimestamps.isEmpty else {
            return nil
        }

        let chunkPath = currentChunkPath!
        let frames = frameTimestamps.enumerated().map { index, timestamp in
            EncodedFrame(
                videoChunkPath: chunkPath,
                frameOffset: index,
                timestamp: timestamp
            )
        }

        try await finalizeCurrentChunk()

        return ChunkFlushResult(videoChunkPath: chunkPath, frames: frames)
    }

    // MARK: - FFmpeg Process Management

    private func startFFmpegProcess(for relativePath: String, videosDir: URL, imageSize: CGSize) async throws {
        // Create day subdirectory if needed
        let components = relativePath.components(separatedBy: "/")
        if components.count > 1 {
            let dayDir = videosDir.appendingPathComponent(components[0], isDirectory: true)
            try FileManager.default.createDirectory(at: dayDir, withIntermediateDirectories: true)
        }

        let fullPath = videosDir.appendingPathComponent(relativePath)

        let outputSize = calculateOutputSize(for: imageSize)
        currentOutputSize = outputSize

        let process = Process()
        process.executableURL = URL(fileURLWithPath: ffmpegPath)
        process.arguments = [
            "-f", "image2pipe",
            "-vcodec", "png",
            "-r", String(frameRate),
            "-i", "-",
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-vcodec", "hevc_videotoolbox",
            "-tag:v", "hvc1",
            "-q:v", "65",
            "-allow_sw", "true",
            "-realtime", "true",
            "-prio_speed", "true",
            "-movflags", "frag_keyframe+empty_moov+default_base_moof",
            "-pix_fmt", "yuv420p",
            "-y",
            fullPath.path
        ]

        let stdinPipe = Pipe()
        process.standardInput = stdinPipe
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice

        try process.run()

        ffmpegProcess = process
        ffmpegStdin = stdinPipe.fileHandleForWriting

        log("VideoChunkEncoder: Started ffmpeg for \(relativePath)")
    }

    private func writeFrame(image: CGImage) async throws {
        guard let stdin = ffmpegStdin,
              let outputSize = currentOutputSize
        else {
            throw ScreenRecordingError.encoderFailed("FFmpeg not ready")
        }

        let pngData: Data = try autoreleasepool {
            let scaledImage = scaleImage(image, to: outputSize)
            guard let data = createPNGData(from: scaledImage) else {
                throw ScreenRecordingError.encoderFailed("Failed to create PNG data")
            }
            return data
        }

        do {
            try stdin.write(contentsOf: pngData)
        } catch {
            throw ScreenRecordingError.encoderFailed("Failed to write frame to ffmpeg: \(error.localizedDescription)")
        }
    }

    private func finalizeCurrentChunk() async throws {
        stalenessCheckTask?.cancel()
        stalenessCheckTask = nil

        let chunkPath = currentChunkPath

        if let stdin = ffmpegStdin {
            try? stdin.close()
            ffmpegStdin = nil
        }

        if let process = ffmpegProcess {
            let pid = process.processIdentifier
            let frameCount = frameTimestamps.count

            let watchdog = Task.detached(priority: .background) {
                try? await Task.sleep(nanoseconds: 10_000_000_000)
                if process.isRunning {
                    logError("VideoChunkEncoder: ffmpeg hung for 10s — force killing PID \(pid)")
                    kill(pid, SIGKILL)
                }
            }

            process.waitUntilExit()
            watchdog.cancel()

            if process.terminationStatus != 0 {
                logError("VideoChunkEncoder: FFmpeg exited with status \(process.terminationStatus)")
            } else {
                log("VideoChunkEncoder: Finalized chunk with \(frameCount) frames")
            }

            ffmpegProcess = nil
        }

        // Notify about completed chunk
        if let chunkPath {
            onChunkFinalized?(chunkPath)
        }

        // Reset state
        frameTimestamps.removeAll()
        currentChunkStartTime = nil
        currentChunkPath = nil
        frameOffsetInChunk = 0
        currentOutputSize = nil
        currentChunkInputSize = nil
        consecutiveWriteFailures = 0
        pendingAspectRatioSize = nil
        pendingAspectRatioSince = nil
    }

    // MARK: - Staleness Detection

    private func resetStalenessTimer() {
        stalenessCheckTask?.cancel()
        let timeout = chunkDuration + 10.0
        stalenessCheckTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))
            guard !Task.isCancelled else { return }
            await self?.finalizeStaleChunkIfNeeded()
        }
    }

    private func finalizeStaleChunkIfNeeded() async {
        guard let startTime = currentChunkStartTime else { return }

        let age = Date().timeIntervalSince(startTime)
        guard age >= chunkDuration else { return }

        log("VideoChunkEncoder: Stale chunk (age: \(String(format: "%.0f", age))s) — finalizing")
        try? await finalizeCurrentChunk()
    }

    // MARK: - Helpers

    private func generateChunkPath(for timestamp: Date) -> String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let dayString = dateFormatter.string(from: timestamp)

        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HHmmss"
        let timeString = timeFormatter.string(from: timestamp)

        return "\(dayString)/chunk_\(timeString).mp4"
    }

    private func hasSignificantAspectRatioChange(from oldSize: CGSize, to newSize: CGSize) -> Bool {
        guard oldSize.height > 0 && newSize.height > 0 else { return true }

        let oldAspect = oldSize.width / oldSize.height
        let newAspect = newSize.width / newSize.height
        let aspectDiff = abs(oldAspect - newAspect) / max(oldAspect, newAspect)

        return aspectDiff > aspectRatioChangeThreshold
    }

    private func calculateOutputSize(for size: CGSize) -> CGSize {
        let maxDimension = max(size.width, size.height)

        if maxDimension <= maxResolution {
            return CGSize(
                width: CGFloat(Int(size.width) / 2 * 2),
                height: CGFloat(Int(size.height) / 2 * 2)
            )
        }

        let scale = maxResolution / maxDimension
        let newWidth = Int(size.width * scale) / 2 * 2
        let newHeight = Int(size.height * scale) / 2 * 2

        return CGSize(width: CGFloat(newWidth), height: CGFloat(newHeight))
    }

    private func scaleImage(_ image: CGImage, to targetSize: CGSize) -> CGImage {
        let currentSize = CGSize(width: image.width, height: image.height)

        if currentSize.width == targetSize.width && currentSize.height == targetSize.height {
            return image
        }

        guard let context = CGContext(
            data: nil,
            width: Int(targetSize.width),
            height: Int(targetSize.height),
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
            return image
        }

        context.interpolationQuality = .high
        context.draw(image, in: CGRect(origin: .zero, size: targetSize))

        return context.makeImage() ?? image
    }

    private func createPNGData(from image: CGImage) -> Data? {
        let bitmapRep = NSBitmapImageRep(cgImage: image)
        return bitmapRep.representation(using: .png, properties: [:])
    }

    // MARK: - Cleanup

    /// Cancel any in-progress encoding and clean up
    public func cancel() async {
        stalenessCheckTask?.cancel()
        stalenessCheckTask = nil

        if let stdin = ffmpegStdin {
            try? stdin.close()
            ffmpegStdin = nil
        }

        if let process = ffmpegProcess {
            let pid = process.processIdentifier
            process.terminate()
            ffmpegProcess = nil
            Task.detached(priority: .background) {
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                if process.isRunning {
                    kill(pid, SIGKILL)
                }
            }
        }

        frameTimestamps.removeAll()
        currentChunkStartTime = nil
        currentChunkPath = nil
        frameOffsetInChunk = 0
        currentOutputSize = nil
        currentChunkInputSize = nil
        consecutiveWriteFailures = 0
    }

    private func emergencyReset() async throws {
        stalenessCheckTask?.cancel()
        stalenessCheckTask = nil

        let droppedFrames = frameTimestamps.count
        logError("VideoChunkEncoder: Emergency reset - dropping \(droppedFrames) frames")

        if let stdin = ffmpegStdin {
            try? stdin.close()
            ffmpegStdin = nil
        }

        if let process = ffmpegProcess {
            let pid = process.processIdentifier
            process.terminate()
            ffmpegProcess = nil
            Task.detached(priority: .background) {
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                if process.isRunning {
                    kill(pid, SIGKILL)
                }
            }
        }

        frameTimestamps.removeAll()
        currentChunkStartTime = nil
        currentChunkPath = nil
        frameOffsetInChunk = 0
        currentOutputSize = nil
        currentChunkInputSize = nil
        consecutiveWriteFailures = 0

        log("VideoChunkEncoder: Emergency reset complete")
    }

    /// Get current buffer status for debugging
    public func getBufferStatus() -> (frameCount: Int, oldestFrameAge: TimeInterval?) {
        let count = frameTimestamps.count
        let age = frameTimestamps.first.map { Date().timeIntervalSince($0) }
        return (count, age)
    }
}
