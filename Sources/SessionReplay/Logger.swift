import Foundation
import os

let logger = os.Logger(subsystem: "com.session-replay", category: "SessionReplay")

func log(_ message: String) {
    logger.info("\(message, privacy: .public)")
}

func logError(_ message: String, error: Error? = nil) {
    if let error {
        logger.error("\(message, privacy: .public): \(error.localizedDescription, privacy: .public)")
    } else {
        logger.error("\(message, privacy: .public)")
    }
}
