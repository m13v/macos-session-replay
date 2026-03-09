import Foundation

/// Uploads completed video chunks to GCS via signed URLs from the backend.
public actor ChunkUploader {

    public struct PendingChunk: Sendable {
        public let localURL: URL
        public let sessionId: String
        public let chunkIndex: Int
        public let relativePath: String
        public let startTimestamp: Date
        public let endTimestamp: Date
        public var retryCount: Int = 0

        public init(
            localURL: URL,
            sessionId: String,
            chunkIndex: Int,
            relativePath: String,
            startTimestamp: Date,
            endTimestamp: Date
        ) {
            self.localURL = localURL
            self.sessionId = sessionId
            self.chunkIndex = chunkIndex
            self.relativePath = relativePath
            self.startTimestamp = startTimestamp
            self.endTimestamp = endTimestamp
        }
    }

    private var queue: [PendingChunk] = []
    private var isProcessing = false
    private let maxRetries = 5

    private let backendURL: String
    private let backendSecret: String
    private let deviceId: String
    private let storage: ChunkStorage

    public init(backendURL: String, backendSecret: String, deviceId: String, storage: ChunkStorage) {
        self.backendURL = backendURL
        self.backendSecret = backendSecret
        self.deviceId = deviceId
        self.storage = storage
    }

    /// Add a completed chunk to the upload queue
    public func enqueue(_ chunk: PendingChunk) {
        queue.append(chunk)
        log("ChunkUploader: Enqueued chunk \(chunk.chunkIndex) for session \(chunk.sessionId)")

        if !isProcessing {
            Task { await processQueue() }
        }
    }

    /// Process the upload queue
    private func processQueue() async {
        guard !isProcessing else { return }
        isProcessing = true

        while !queue.isEmpty {
            var chunk = queue.removeFirst()

            do {
                try await uploadChunk(chunk)
                log("ChunkUploader: Uploaded chunk \(chunk.chunkIndex) for session \(chunk.sessionId)")

                // Delete local file after successful upload
                try? await storage.deleteChunk(
                    sessionId: chunk.sessionId,
                    relativePath: chunk.relativePath
                )
            } catch {
                chunk.retryCount += 1
                logError("ChunkUploader: Failed to upload chunk \(chunk.chunkIndex) (attempt \(chunk.retryCount)/\(maxRetries))", error: error)

                if chunk.retryCount < maxRetries {
                    // Exponential backoff: 2^n seconds, capped at 5 minutes
                    let delay = min(pow(2.0, Double(chunk.retryCount)), 300.0)
                    try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                    queue.append(chunk)
                } else {
                    logError("ChunkUploader: Giving up on chunk \(chunk.chunkIndex) after \(maxRetries) attempts — keeping local file")
                }
            }
        }

        isProcessing = false
    }

    /// Upload a single chunk
    private func uploadChunk(_ chunk: PendingChunk) async throws {
        // 1. Get signed URL from backend
        let signedURL = try await getSignedURL(chunk: chunk)

        // 2. Read chunk data
        let chunkData = try Data(contentsOf: chunk.localURL)

        // 3. Upload to GCS via signed URL
        var request = URLRequest(url: signedURL)
        request.httpMethod = "PUT"
        request.setValue("video/mp4", forHTTPHeaderField: "Content-Type")
        request.setValue("\(chunkData.count)", forHTTPHeaderField: "Content-Length")

        let (_, response) = try await URLSession.shared.upload(for: request, from: chunkData)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
            throw ScreenRecordingError.uploadFailed("GCS upload returned status \(statusCode)")
        }
    }

    /// Get a signed upload URL from the backend
    private func getSignedURL(chunk: PendingChunk) async throws -> URL {
        guard let url = URL(string: "\(backendURL)/api/session-recording/get-upload-url") else {
            throw ScreenRecordingError.uploadFailed("Invalid backend URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(backendSecret)", forHTTPHeaderField: "Authorization")

        let body: [String: Any] = [
            "device_id": deviceId,
            "session_id": chunk.sessionId,
            "chunk_index": chunk.chunkIndex,
            "start_timestamp": ISO8601DateFormatter().string(from: chunk.startTimestamp),
            "end_timestamp": ISO8601DateFormatter().string(from: chunk.endTimestamp),
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
            throw ScreenRecordingError.uploadFailed("Backend returned status \(statusCode)")
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let uploadURLString = json["upload_url"] as? String,
              let uploadURL = URL(string: uploadURLString) else {
            throw ScreenRecordingError.uploadFailed("Invalid response from backend")
        }

        return uploadURL
    }

    /// Get current queue size
    public var pendingCount: Int {
        queue.count
    }
}
