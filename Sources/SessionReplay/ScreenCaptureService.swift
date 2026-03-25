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

    // MARK: - Active Window Capture

    /// Capture result that includes the image and metadata about which app/window was captured.
    public struct CaptureResult: Sendable {
        public let image: CGImage
        public let appName: String?
        public let windowTitle: String?
    }

    /// Capture the frontmost application's focused window as a CGImage.
    /// Uses CGWindowList z-order to find the topmost window (not largest by area).
    /// Falls back to full display capture if the active window can't be identified.
    @available(macOS 14.0, *)
    public func captureActiveWindow() async -> CaptureResult? {
        let (appName, windowTitle, focusedWindowID) = Self.getActiveWindowInfo()

        guard let frontApp = NSWorkspace.shared.frontmostApplication else {
            // No frontmost app — fall back to full display
            guard let image = await captureFullDisplay() else { return nil }
            return CaptureResult(image: image, appName: nil, windowTitle: nil)
        }

        let activePID = frontApp.processIdentifier

        do {
            let content = try await SCShareableContent.excludingDesktopWindows(
                false,
                onScreenWindowsOnly: true
            )

            let appWindows = content.windows.filter {
                $0.owningApplication?.processID == activePID && $0.isOnScreen && $0.frame.width > 100 && $0.frame.height > 100
            }

            // Prefer the focused window (matched by CGWindowList z-order),
            // fall back to largest if the focused window ID isn't in SCKit's list
            let targetWindow: SCWindow?
            if let fwID = focusedWindowID {
                targetWindow = appWindows.first(where: { $0.windowID == fwID })
                    ?? appWindows.max(by: { $0.frame.width * $0.frame.height < $1.frame.width * $1.frame.height })
            } else {
                targetWindow = appWindows.max(by: { $0.frame.width * $0.frame.height < $1.frame.width * $1.frame.height })
            }

            guard let targetWindow else {
                // App has no sizable windows — fall back to full display
                guard let image = await captureFullDisplay() else { return nil }
                return CaptureResult(image: image, appName: appName, windowTitle: windowTitle)
            }

            let filter = SCContentFilter(desktopIndependentWindow: targetWindow)
            let config = SCStreamConfiguration()
            config.scalesToFit = true
            config.showsCursor = true

            // Use window's actual size, capped
            let windowWidth = min(targetWindow.frame.width, maxSize)
            let windowHeight = min(targetWindow.frame.height, maxSize)
            let aspectRatio = targetWindow.frame.width / targetWindow.frame.height

            var configWidth = windowWidth
            var configHeight = windowHeight
            if configWidth / configHeight != aspectRatio {
                if configWidth / aspectRatio <= maxSize {
                    configHeight = configWidth / aspectRatio
                } else {
                    configWidth = configHeight * aspectRatio
                }
            }

            config.width = Int(configWidth)
            config.height = Int(configHeight)

            let image = try await SCScreenshotManager.captureImage(
                contentFilter: filter,
                configuration: config
            )
            return CaptureResult(image: image, appName: appName, windowTitle: windowTitle)
        } catch {
            log("ScreenCaptureService: Active window capture error: \(error.localizedDescription)")
            // Fall back to full display
            guard let image = await captureFullDisplay() else { return nil }
            return CaptureResult(image: image, appName: appName, windowTitle: windowTitle)
        }
    }

    // MARK: - Active Window Info

    /// Get the active app name, window title, and focused window ID.
    /// Uses CGWindowList z-order (front-to-back) to find the topmost normal-layer window
    /// for the frontmost app, rather than the largest window by area.
    public static func getActiveWindowInfo() -> (appName: String?, windowTitle: String?, focusedWindowID: CGWindowID?) {
        guard let frontApp = NSWorkspace.shared.frontmostApplication else {
            return (nil, nil, nil)
        }

        let appName = frontApp.localizedName
        let activePID = frontApp.processIdentifier

        guard let windowList = CGWindowListCopyWindowInfo(
            [.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID
        ) as? [[String: Any]] else {
            return (appName, nil, nil)
        }

        // CGWindowList returns windows in z-order (front to back).
        // Find the first normal-layer (layer 0) window for this PID — that's the focused one.
        for window in windowList {
            guard let windowPID = window[kCGWindowOwnerPID as String] as? Int32,
                  windowPID == activePID,
                  let layer = window[kCGWindowLayer as String] as? Int,
                  layer == 0,
                  let bounds = window[kCGWindowBounds as String] as? [String: CGFloat],
                  let width = bounds["Width"],
                  let height = bounds["Height"],
                  width > 100 && height > 100
            else { continue }

            let title = window[kCGWindowName as String] as? String
            let windowID = window[kCGWindowNumber as String] as? CGWindowID
            return (appName, title, windowID)
        }

        return (appName, nil, nil)
    }
}
