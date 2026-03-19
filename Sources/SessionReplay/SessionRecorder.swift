import CoreGraphics
import Foundation
import ScreenCaptureKit

/// Main orchestrator for session screen recording.
/// Captures the full display at a configurable FPS, encodes to H.265 video chunks,
/// and uploads completed chunks to the cloud.
public actor SessionRecorder {

    // MARK: - Configuration

    public struct Configuration: Sendable {
        public var framesPerSecond: Double
        public var chunkDurationSeconds: TimeInterval
        public var ffmpegPath: String
        public var storageBaseURL: URL
        public var deviceId: String
        public var backendURL: String?
        public var backendSecret: String?

        public init(
            framesPerSecond: Double = 5.0,
            chunkDurationSeconds: TimeInterval = 60.0,
            ffmpegPath: String,
            storageBaseURL: URL,
            deviceId: String,
            backendURL: String? = nil,
            backendSecret: String? = nil
        ) {
            self.framesPerSecond = framesPerSecond
            self.chunkDurationSeconds = chunkDurationSeconds
            self.ffmpegPath = ffmpegPath
            self.storageBaseURL = storageBaseURL
            self.deviceId = deviceId
            self.backendURL = backendURL
            self.backendSecret = backendSecret
        }
    }

    // MARK: - State

    private let config: Configuration
    private let encoder: VideoChunkEncoder
    private let storage: ChunkStorage
    private let uploader: ChunkUploader?
    private let captureService: ScreenCaptureService

    private var captureTask: Task<Void, Never>?
    private var sessionId: String?
    private var frameNumber: Int = 0
    private var chunkIndex: Int = 0
    private var chunkStartTime: Date?

    public private(set) var isRecording: Bool = false
    public private(set) var isPaused: Bool = false

    /// Called when a chunk is finalized and ready on disk, before upload.
    /// The consumer can read the file at `localURL` for local analysis.
    /// The chunk will be uploaded (and potentially deleted) after this callback returns.
    public var onChunkReady: (@Sendable (ChunkInfo) async -> Void)?

    /// Metadata about a finalized chunk.
    public struct ChunkInfo: Sendable {
        public let localURL: URL
        public let sessionId: String
        public let chunkIndex: Int
        public let startTimestamp: Date
        public let endTimestamp: Date
    }

    // MARK: - Initialization

    public init(configuration: Configuration) {
        self.config = configuration
        self.captureService = ScreenCaptureService()
        self.storage = ChunkStorage(baseDirectory: configuration.storageBaseURL)
        self.encoder = VideoChunkEncoder(
            frameRate: configuration.framesPerSecond,
            chunkDuration: configuration.chunkDurationSeconds,
            ffmpegPath: configuration.ffmpegPath
        )
        if let backendURL = configuration.backendURL,
           let backendSecret = configuration.backendSecret,
           !backendURL.isEmpty, !backendSecret.isEmpty {
            self.uploader = ChunkUploader(
                backendURL: backendURL,
                backendSecret: backendSecret,
                deviceId: configuration.deviceId,
                storage: storage
            )
        } else {
            self.uploader = nil
            log("SessionRecorder: local-only mode (no backend URL)")
        }
    }

    // MARK: - Recording Control

    /// Start recording the screen
    public func start() async throws {
        guard !isRecording else {
            log("SessionRecorder: Already recording")
            return
        }

        // Check permission
        guard ScreenCaptureService.checkPermission() else {
            throw ScreenRecordingError.noPermission
        }

        // Create new session
        let newSessionId = UUID().uuidString
        self.sessionId = newSessionId
        self.frameNumber = 0
        self.chunkIndex = 0
        self.chunkStartTime = nil

        // Initialize storage
        let videosDir = try await storage.initializeSession(sessionId: newSessionId)
        try await encoder.initialize(videosDirectory: videosDir)

        // Set up chunk completion callback
        await encoder.setOnChunkFinalized { [weak self] chunkPath in
            guard let self else { return }
            Task {
                await self.handleChunkFinalized(chunkPath: chunkPath)
            }
        }

        isRecording = true

        // Start capture loop
        let interval = 1.0 / config.framesPerSecond
        captureTask = Task { [weak self] in
            while !Task.isCancelled {
                guard let self else { break }

                let startTime = ContinuousClock.now
                await self.captureFrame()
                let elapsed = ContinuousClock.now - startTime

                // Sleep for the remaining interval
                let remaining = Duration.seconds(interval) - elapsed
                if remaining > .zero {
                    try? await Task.sleep(for: remaining)
                }
            }
        }

        log("SessionRecorder: Started session \(newSessionId) at \(config.framesPerSecond) FPS")
    }

    /// Pause frame capture without stopping the session.
    /// The capture loop keeps running but skips frames. If paused long enough,
    /// the encoder's staleness timer will finalize the current chunk automatically.
    /// Call `resume()` to continue capturing.
    public func pause() {
        guard isRecording, !isPaused else { return }
        isPaused = true
        log("SessionRecorder: Paused")
    }

    /// Resume frame capture after a pause.
    public func resume() {
        guard isRecording, isPaused else { return }
        isPaused = false
        log("SessionRecorder: Resumed")
    }

    /// Stop recording
    public func stop() async {
        guard isRecording else { return }

        captureTask?.cancel()
        captureTask = nil

        // Flush any remaining frames
        if let result = try? await encoder.flushCurrentChunk() {
            await handleChunkFinalized(chunkPath: result.videoChunkPath)
        }

        isRecording = false
        log("SessionRecorder: Stopped session \(sessionId ?? "unknown")")
    }

    // MARK: - Capture Loop

    private func captureFrame() async {
        guard isRecording, !isPaused else { return }

        // Capture full display
        guard let cgImage = await captureService.captureFullDisplay() else {
            return
        }

        let now = Date()
        if chunkStartTime == nil {
            chunkStartTime = now
        }

        // Get active window info for metadata (will be used for chunk metadata)
        let (_appName, _windowTitle) = ScreenCaptureService.getActiveWindowInfo()
        _ = (_appName, _windowTitle)

        // Feed to encoder
        do {
            let _ = try await encoder.addFrame(image: cgImage, timestamp: now)
            frameNumber += 1
        } catch {
            logError("SessionRecorder: Failed to encode frame \(frameNumber)", error: error)
        }
    }

    // MARK: - Chunk Management

    private func handleChunkFinalized(chunkPath: String) async {
        guard let sessionId else { return }

        let chunkURL = await storage.chunkURL(sessionId: sessionId, relativePath: chunkPath)
        let now = Date()

        // Notify consumer before upload (they can read the file on disk)
        let info = ChunkInfo(
            localURL: chunkURL,
            sessionId: sessionId,
            chunkIndex: chunkIndex,
            startTimestamp: chunkStartTime ?? now,
            endTimestamp: now
        )
        await onChunkReady?(info)

        // Upload to cloud (and delete local file on success) — skip in local-only mode
        if let uploader {
            let chunk = ChunkUploader.PendingChunk(
                localURL: chunkURL,
                sessionId: sessionId,
                chunkIndex: chunkIndex,
                relativePath: chunkPath,
                startTimestamp: chunkStartTime ?? now,
                endTimestamp: now
            )

            await uploader.enqueue(chunk)
        }

        chunkIndex += 1
        chunkStartTime = now
    }

    /// Set the chunk-ready callback from outside the actor.
    public func setOnChunkReady(_ callback: @escaping @Sendable (ChunkInfo) async -> Void) {
        self.onChunkReady = callback
    }

    /// Get current recording status
    public func getStatus() async -> (isRecording: Bool, isPaused: Bool, sessionId: String?, frameCount: Int, pendingUploads: Int) {
        let pending = await uploader?.pendingCount ?? 0
        return (isRecording, isPaused, sessionId, frameNumber, pending)
    }
}

// Extension to set the callback on the encoder
extension VideoChunkEncoder {
    func setOnChunkFinalized(_ callback: @escaping @Sendable (String) -> Void) {
        self.onChunkFinalized = callback
    }
}
