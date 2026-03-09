import Foundation

/// Represents a captured screen frame
public struct CapturedFrame: Sendable {
    /// Name of the active application
    public let appName: String

    /// Title of the active window (if available)
    public let windowTitle: String?

    /// Sequential frame number for ordering
    public let frameNumber: Int

    /// Timestamp when the frame was captured
    public let captureTime: Date

    public init(
        appName: String,
        windowTitle: String? = nil,
        frameNumber: Int,
        captureTime: Date = Date()
    ) {
        self.appName = appName
        self.windowTitle = windowTitle
        self.frameNumber = frameNumber
        self.captureTime = captureTime
    }
}
