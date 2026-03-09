// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SessionReplayTest",
    platforms: [
        .macOS("14.0")
    ],
    dependencies: [
        .package(path: ".."),
    ],
    targets: [
        .executableTarget(
            name: "SessionReplayTest",
            dependencies: [
                .product(name: "SessionReplay", package: "macos-session-replay"),
            ],
            path: "Sources"
        ),
    ]
)
