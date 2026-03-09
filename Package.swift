// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MacOSSessionReplay",
    platforms: [
        .macOS("14.0")
    ],
    products: [
        .library(
            name: "SessionReplay",
            targets: ["SessionReplay"]
        ),
    ],
    targets: [
        .target(
            name: "SessionReplay",
            path: "Sources/SessionReplay"
        ),
    ]
)
