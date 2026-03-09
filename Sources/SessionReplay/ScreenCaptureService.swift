import AppKit
import CoreGraphics
import Foundation
import ScreenCaptureKit

/// Screen capture service for recording the full display.
public final class ScreenCaptureService: Sendable {
    private let maxSize: CGFloat = 3000

    public init() {}

    /// Check if we have screen recording permission
    public static func checkPermission() -> Bool {
        return CGPreflightScreenCaptureAccess()
    }

    /// Request screen recording permission
    public static func requestPermission() {
        CGRequestScreenCaptureAccess()
    }

    // MARK: - Full Display Capture

    /// Capture the full primary display as a CGImage.
    /// This is the primary capture method for session recording.
    @available(macOS 14.0, *)
    public func captureFullDisplay() async -> CGImage? {
        do {
            let content = try await SCShareableContent.excludingDesktopWindows(
                false,
                onScreenWindowsOnly: true
            )

            guard let display = content.displays.first else {
                log("ScreenCaptureService: No display found")
                return nil
            }

            let filter = SCContentFilter(display: display, excludingWindows: [])
            let config = SCStreamConfiguration()
            config.scalesToFit = true
            config.showsCursor = true

            // Use display native resolution, capped at maxSize
            var configWidth = min(CGFloat(display.width), maxSize)
            var configHeight = min(CGFloat(display.height), maxSize)
            let aspectRatio = CGFloat(display.width) / CGFloat(display.height)

            if configWidth / configHeight != aspectRatio {
                if configWidth / aspectRatio <= maxSize {
                    configHeight = configWidth / aspectRatio
                } else {
                    configWidth = configHeight * aspectRatio
                }
            }

            config.width = Int(configWidth)
            config.height = Int(configHeight)

            return try await SCScreenshotManager.captureImage(
                contentFilter: filter,
                configuration: config
            )
        } catch {
            log("ScreenCaptureService: Capture error: \(error.localizedDescription)")
            return nil
        }
    }

    // MARK: - Active Window Info

    /// Get the active app name and window title
    public static func getActiveWindowInfo() -> (appName: String?, windowTitle: String?) {
        guard let frontApp = NSWorkspace.shared.frontmostApplication else {
            return (nil, nil)
        }

        let appName = frontApp.localizedName
        let activePID = frontApp.processIdentifier

        guard let windowList = CGWindowListCopyWindowInfo(
            [.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID
        ) as? [[String: Any]] else {
            return (appName, nil)
        }

        // Find largest window for this PID
        var bestTitle: String?
        var bestArea: CGFloat = 0

        for window in windowList {
            guard let windowPID = window[kCGWindowOwnerPID as String] as? Int32,
                  windowPID == activePID,
                  let bounds = window[kCGWindowBounds as String] as? [String: CGFloat],
                  let width = bounds["Width"],
                  let height = bounds["Height"],
                  width > 100 && height > 100
            else { continue }

            let area = width * height
            if area > bestArea {
                bestArea = area
                bestTitle = window[kCGWindowName as String] as? String
            }
        }

        return (appName, bestTitle)
    }
}
