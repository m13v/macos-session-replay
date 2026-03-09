import Foundation

/// Manages local storage for session recording video chunks.
/// Chunks are stored temporarily until uploaded, then deleted.
public actor ChunkStorage {
    private let fileManager = FileManager.default
    private let baseDirectory: URL

    public init(baseDirectory: URL) {
        self.baseDirectory = baseDirectory
    }

    /// Create the session directory and return the videos path
    public func initializeSession(sessionId: String) async throws -> URL {
        let sessionDir = baseDirectory
            .appendingPathComponent(sessionId, isDirectory: true)
        let videosDir = sessionDir
            .appendingPathComponent("Videos", isDirectory: true)

        try fileManager.createDirectory(at: videosDir, withIntermediateDirectories: true)
        log("ChunkStorage: Initialized session at \(sessionDir.path)")

        return videosDir
    }

    /// Get the full path for a chunk
    public func chunkURL(sessionId: String, relativePath: String) -> URL {
        return baseDirectory
            .appendingPathComponent(sessionId, isDirectory: true)
            .appendingPathComponent("Videos", isDirectory: true)
            .appendingPathComponent(relativePath)
    }

    /// Delete a chunk after successful upload
    public func deleteChunk(sessionId: String, relativePath: String) throws {
        let url = chunkURL(sessionId: sessionId, relativePath: relativePath)
        if fileManager.fileExists(atPath: url.path) {
            try fileManager.removeItem(at: url)
            log("ChunkStorage: Deleted \(relativePath)")
        }
    }

    /// Delete an entire session directory
    public func deleteSession(sessionId: String) throws {
        let sessionDir = baseDirectory.appendingPathComponent(sessionId, isDirectory: true)
        if fileManager.fileExists(atPath: sessionDir.path) {
            try fileManager.removeItem(at: sessionDir)
            log("ChunkStorage: Deleted session \(sessionId)")
        }
    }

    /// Get all pending chunk files for a session (not yet uploaded)
    public func pendingChunks(sessionId: String) throws -> [URL] {
        let videosDir = baseDirectory
            .appendingPathComponent(sessionId, isDirectory: true)
            .appendingPathComponent("Videos", isDirectory: true)

        guard fileManager.fileExists(atPath: videosDir.path) else { return [] }

        var chunks: [URL] = []
        let enumerator = fileManager.enumerator(
            at: videosDir,
            includingPropertiesForKeys: [.isRegularFileKey],
            options: .skipsHiddenFiles
        )

        while let fileURL = enumerator?.nextObject() as? URL {
            if fileURL.pathExtension == "mp4" {
                chunks.append(fileURL)
            }
        }

        return chunks.sorted { $0.lastPathComponent < $1.lastPathComponent }
    }

    /// Get total storage size for all sessions
    public func totalStorageSize() throws -> Int64 {
        guard fileManager.fileExists(atPath: baseDirectory.path) else { return 0 }

        var totalSize: Int64 = 0
        let resourceKeys: Set<URLResourceKey> = [.fileSizeKey, .isDirectoryKey]
        let enumerator = fileManager.enumerator(
            at: baseDirectory,
            includingPropertiesForKeys: Array(resourceKeys),
            options: .skipsHiddenFiles
        )

        while let fileURL = enumerator?.nextObject() as? URL {
            let resourceValues = try fileURL.resourceValues(forKeys: resourceKeys)
            if resourceValues.isDirectory == false {
                totalSize += Int64(resourceValues.fileSize ?? 0)
            }
        }

        return totalSize
    }

    /// Clean up empty directories
    public func cleanupEmptyDirectories() throws {
        guard fileManager.fileExists(atPath: baseDirectory.path) else { return }

        let contents = try fileManager.contentsOfDirectory(
            at: baseDirectory,
            includingPropertiesForKeys: [.isDirectoryKey],
            options: .skipsHiddenFiles
        )

        for url in contents {
            let resourceValues = try url.resourceValues(forKeys: [.isDirectoryKey])
            if resourceValues.isDirectory == true {
                let subContents = try fileManager.contentsOfDirectory(atPath: url.path)
                if subContents.isEmpty {
                    try fileManager.removeItem(at: url)
                    log("ChunkStorage: Removed empty directory \(url.lastPathComponent)")
                }
            }
        }
    }
}
