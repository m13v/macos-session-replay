import Foundation

public enum ScreenRecordingError: LocalizedError {
    case notInitialized
    case encoderFailed(String)
    case uploadFailed(String)
    case storageError(String)
    case noPermission
    case ffmpegNotFound

    public var errorDescription: String? {
        switch self {
        case .notInitialized:
            return "Screen recording not initialized"
        case .encoderFailed(let msg):
            return "Encoder failed: \(msg)"
        case .uploadFailed(let msg):
            return "Upload failed: \(msg)"
        case .storageError(let msg):
            return "Storage error: \(msg)"
        case .noPermission:
            return "Screen recording permission not granted"
        case .ffmpegNotFound:
            return "ffmpeg not found"
        }
    }
}
