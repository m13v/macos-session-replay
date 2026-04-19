import type { Metadata } from "next";
import {
  Breadcrumbs,
  ArticleMeta,
  ProofBand,
  FaqSection,
  RemotionClip,
  AnimatedBeam,
  BackgroundGrid,
  GradientText,
  NumberTicker,
  ShimmerButton,
  Marquee,
  BentoGrid,
  AnimatedCodeBlock,
  TerminalOutput,
  ComparisonTable,
  StepTimeline,
  GlowCard,
  InlineCta,
  articleSchema,
  breadcrumbListSchema,
  faqPageSchema,
  type BentoCard,
  type ComparisonRow,
} from "@seo/components";

const PAGE_URL = "https://macos-session-replay.com/t/session-replay-tools";
const PUBLISHED = "2026-04-18";

export const metadata: Metadata = {
  title:
    "Session replay tools for native macOS apps (why the web-DOM tools cannot record them)",
  description:
    "Every session replay tools roundup covers browser SaaS (Hotjar, FullStory, LogRocket, PostHog, Clarity) that snapshot the DOM. None of them record a native macOS window. This guide explains the architectural reason, then walks through the only open-source SDK that captures native macOS sessions via ScreenCaptureKit and hardware H.265.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title:
      "Session replay tools for native macOS apps",
    description:
      "Browser DOM replay is blind to native Swift windows. Here is the capture pipeline that actually works on macOS, with exact ffmpeg args, 60-second chunk rotation, and a per-frame active-window manifest.",
    url: PAGE_URL,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Session replay tools for native macOS, not the browser",
    description:
      "ScreenCaptureKit at 5 FPS, H.265 via hevc_videotoolbox, 60s chunks, and a CGWindowList-z-order manifest for every chunk.",
  },
  robots: { index: true, follow: true },
};

const breadcrumbItems = [
  { label: "macOS Session Replay", href: "/" },
  { label: "Guides", href: "/t" },
  { label: "Session replay tools" },
];

const breadcrumbSchemaItems = [
  { name: "macOS Session Replay", url: "https://macos-session-replay.com/" },
  { name: "Guides", url: "https://macos-session-replay.com/t" },
  { name: "Session replay tools", url: PAGE_URL },
];

const ffmpegArgsCode = `// Sources/SessionReplay/VideoChunkEncoder.swift:226-242
process.arguments = [
  "-f", "rawvideo",
  "-pixel_format", "bgra",
  "-video_size", "\\(inputWidth)x\\(inputHeight)",
  "-r", String(frameRate),                  // 5 fps in, 5 fps out
  "-i", "-",                                 // raw BGRA piped on stdin
  "-vcodec", "hevc_videotoolbox",            // Apple Silicon / Intel ME encode
  "-tag:v", "hvc1",                          // QuickTime-compatible HEVC tag
  "-q:v", "65",                              // VideoToolbox quality scale
  "-allow_sw", "true",                       // fall back if HW denies
  "-realtime", "true",
  "-prio_speed", "true",
  "-movflags", "frag_keyframe+empty_moov+default_base_moof",
  "-pix_fmt", "yuv420p",
  "-y",
  fullPath.path
]`;

const activeWindowCode = `// Sources/SessionReplay/ScreenCaptureService.swift:169-194
guard let windowList = CGWindowListCopyWindowInfo(
  [.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID
) as? [[String: Any]] else { return (appName, nil, nil) }

// CGWindowList returns windows in z-order (front to back).
// First layer-0 window for the frontmost PID is the focused one.
for window in windowList {
  guard let windowPID = window[kCGWindowOwnerPID as String] as? Int32,
        windowPID == activePID,
        let layer = window[kCGWindowLayer as String] as? Int,
        layer == 0,
        let bounds = window[kCGWindowBounds as String] as? [String: CGFloat],
        let width  = bounds["Width"],
        let height = bounds["Height"],
        width > 100 && height > 100
  else { continue }
  let title = window[kCGWindowName as String] as? String
  return (appName, title, window[kCGWindowNumber as String] as? CGWindowID)
}`;

const configCode = `// Sources/SessionReplay/SessionRecorder.swift
public struct Config {
  public var framesPerSecond: Double = 5.0           // 1 frame every 200 ms
  public var chunkDurationSeconds: Double = 60.0     // one .mp4 per minute
  public var captureMode: CaptureMode = .activeWindow // or .fullDisplay
  public var aspectRatioChangeThreshold: Double = 0.2 // 20% swing triggers rotation
  public var aspectRatioStabilityDelay:  Double = 2.0 // debounce before we trust it
  public var maxConsecutiveFailures: Int = 5          // ffmpeg reset threshold
}`;

const chunkRotationTerminal = [
  { type: "command" as const, text: "# 5 FPS * 60 s = ~300 frames into one chunk" },
  { type: "output"  as const, text: "[encoder] chunk opened  path=2026-04-18/chunk_140231.mp4  size=1440x900" },
  { type: "output"  as const, text: "[encoder] frames buffered=42  app=\"Xcode\"  window=\"VideoChunkEncoder.swift\"" },
  { type: "output"  as const, text: "[encoder] frames buffered=118 app=\"Safari\" window=\"Apple Developer Documentation\"" },
  { type: "command" as const, text: "# user tiles two windows side by side; capture ratio shifts ~28%" },
  { type: "output"  as const, text: "[encoder] aspect-ratio delta=0.28  stability-wait=2.0s" },
  { type: "output"  as const, text: "[encoder] delta stable  -> finalize chunk_140231.mp4  (3.4 MB, 297 frames)" },
  { type: "output"  as const, text: "[encoder] chunk opened  path=2026-04-18/chunk_140331.mp4  size=2560x900" },
  { type: "success" as const, text: "onChunkReady fired  sessionId=s_7aF2  chunkIndex=14  activeApps=[Xcode:212, Safari:85]" },
];

const webVsNativePipelineRows: ComparisonRow[] = [
  {
    feature: "How frames are captured",
    competitor: "JS snapshots the DOM tree and mutation records",
    ours: "ScreenCaptureKit hands BGRA pixel buffers from the compositor",
  },
  {
    feature: "What happens inside a native app",
    competitor: "Nothing. No DOM exists. The tool sees an empty `<body>` or nothing at all",
    ours: "Every AppKit, SwiftUI, Catalyst, and Electron window gets rendered into the same capture stream",
  },
  {
    feature: "Replay storage shape",
    competitor: "Event log replayed by a JS runtime in the browser",
    ours: "Real .mp4 video file, fragmented MP4 so you can stream from an offset",
  },
  {
    feature: "Encoder",
    competitor: "None. Events are JSON",
    ours: "hardware HEVC via `hevc_videotoolbox` with `-tag:v hvc1`",
  },
  {
    feature: "Active-element tracking",
    competitor: "CSS selector paths out of the live DOM",
    ours: "Per-frame tally of the topmost layer-0 window from `CGWindowListCopyWindowInfo` keyed by `{appName}||{windowTitle}`",
  },
  {
    feature: "Where it fails",
    competitor: "PDFs, canvas apps, WebGL, cross-origin iframes, native wrappers (Electron shell, WKWebView)",
    ours: "Runs across any visible window, but needs Screen Recording permission and 50-100 MB of RAM",
  },
  {
    feature: "Where the data lives",
    competitor: "Vendor cloud; priced per session",
    ours: "Local disk, your own GCS bucket via signed URL, or both",
  },
];

const competitorMarquee = [
  "Hotjar",
  "FullStory",
  "LogRocket",
  "Microsoft Clarity",
  "PostHog",
  "Mouseflow",
  "Smartlook",
  "Inspectlet",
  "Satchel",
  "Glassbox",
];

const nativeWindowsMarquee = [
  "AppKit",
  "SwiftUI",
  "Mac Catalyst",
  "Electron",
  "Qt for macOS",
  "React Native macOS",
  "WKWebView embedded apps",
  "Flutter desktop",
  "Chromium shells",
  "Tauri",
];

const categoryBento: BentoCard[] = [
  {
    title: "1. Browser DOM replayers",
    description:
      "Hotjar, FullStory, LogRocket, Clarity, PostHog, Mouseflow, Smartlook. A script tag snapshots the DOM + mutations + pointer events, and a JS player rebuilds the page on demand. Works only inside a browser tab. A native macOS window is outside their universe.",
    size: "1x1",
  },
  {
    title: "2. Mobile SDK replayers",
    description:
      "UXCam, Smartlook Mobile, Sentry Session Replay for iOS/Android. View-tree instrumentation inside the app binary. No macOS equivalent ships for AppKit or SwiftUI. Catalyst apps sometimes work via the iOS SDK; pure AppKit apps never do.",
    size: "1x1",
  },
  {
    title: "3. Screen recorders masquerading as replay",
    description:
      "QuickTime, CleanShot X, Loom, Zoom cloud recording. They produce a .mov or .mp4 of the whole display. No per-session metadata, no per-chunk active-window manifest, no signed-URL upload pipeline, no deep-link to a specific moment.",
    size: "1x1",
  },
  {
    title: "4. Native macOS session replay SDK",
    description:
      "A Swift Package that drives ScreenCaptureKit at 5 FPS, pipes raw BGRA into `hevc_videotoolbox`, rotates a new 60-second fragmented MP4 every minute, and attaches a manifest of the most-focused windows to every chunk. The category this page was built for.",
    size: "2x1",
    accent: true,
  },
];

const pipelineSteps = [
  {
    title: "ScreenCaptureKit pulls a frame",
    description:
      "`SCScreenshotManager.captureImage(with:)` fires every 200 ms (5 FPS). If `captureMode == .activeWindow`, the SDK scopes the capture to the frontmost app's focused window via a `CGWindowList` lookup. Any monitor above 3000 px is downscaled so the encoder stays in realtime mode.",
  },
  {
    title: "Active window tallied into the manifest",
    description:
      "Before the frame reaches the encoder, the SDK records `{appName}||{windowTitle}` as a key in a per-chunk dictionary and bumps its count. After 300 frames the dictionary is sorted by frame count, and the top entries become `ChunkInfo.activeApps`, the manifest attached to the chunk.",
  },
  {
    title: "Raw BGRA streams into hevc_videotoolbox",
    description:
      "`VideoChunkEncoder` keeps a ffmpeg subprocess alive per chunk and writes the frame buffer to stdin. The encoder runs with `-realtime true -prio_speed true` so it drops nothing at 5 FPS on Apple Silicon. Hardware fallback to software is explicit via `-allow_sw true`.",
  },
  {
    title: "A fragmented MP4 chunk closes every 60 seconds",
    description:
      "`-movflags frag_keyframe+empty_moov+default_base_moof` means the chunk is streamable before ffmpeg writes the trailing `moov` atom. The SDK also rotates the chunk early if the capture aspect ratio shifts more than 20% and stays stable for 2 seconds, so a resize or display switch never produces a squashed replay.",
  },
  {
    title: "ChunkUploader pushes to GCS via signed URL",
    description:
      "For each chunk the SDK POSTs `{ device_id, session_id, chunk_index, start_timestamp, end_timestamp }` to a backend, gets back a 1-hour signed upload URL, and PUTs the .mp4 with `Content-Type: video/mp4`. Failures retry with exponential backoff capped at 5 minutes. 0-byte chunks are skipped and deleted locally.",
  },
  {
    title: "Gemini Vision analyzes up to 60 minutes at a time",
    description:
      "The web player side of the system accepts up to 60 chunks per analyze request, each capped at 20 MB. Chunks under 1.5 MB are inlined as base64; larger ones go through Gemini's resumable File API. The default prompt asks Gemini to pick the single most-automatable task from an hour of desktop activity.",
  },
];

const faqItems = [
  {
    q: "Why can't I use Hotjar or FullStory to record sessions in a native macOS app?",
    a: "Every major session replay SaaS (Hotjar, FullStory, LogRocket, Clarity, PostHog) works by injecting a JavaScript tag into a web page and snapshotting the live DOM and mutation records. A native macOS app built with AppKit or SwiftUI has no DOM. The views render through AppKit/CoreAnimation straight to the compositor, so the rrweb-style `MutationObserver` pipeline has nothing to observe. To replay a native Swift session you need pixel capture from ScreenCaptureKit plus metadata from CGWindowList, which is the approach this SDK takes.",
  },
  {
    q: "Does screen recording a macOS session produce the same thing as a session replay tool?",
    a: "Not quite. QuickTime or a generic screen recorder gives you one long .mov. A session replay pipeline needs three extra things: discrete chunks so you can seek and stream (this SDK rotates every 60 seconds, configurable via `chunkDurationSeconds`), per-chunk metadata so you can index and search (the `activeApps` manifest keyed by `{appName}||{windowTitle}`), and a signed-URL upload flow so chunks leave the machine immediately rather than piling up as 10 GB local files. Without those three, you have screen recordings, not replay.",
  },
  {
    q: "How does the SDK track which window is active without accessibility permissions?",
    a: "It uses `CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID)`, which is available under the standard Screen Recording TCC grant rather than the much stricter Accessibility grant. The returned list is already in z-order (front to back). The SDK walks it, picks the first window whose `kCGWindowLayer` is 0 (normal layer, not overlays or menubar) and whose `kCGWindowOwnerPID` matches the frontmost app, then reads `kCGWindowName`. The filter width > 100 and height > 100 drops tooltip and sheet windows so the manifest does not get polluted.",
  },
  {
    q: "Why H.265 with `hevc_videotoolbox` instead of H.264 or VP9?",
    a: "Size. At 5 FPS a 1440x900 desktop encodes to roughly 120 to 300 MB per hour with HEVC, compared to 300 to 700 MB with H.264 at comparable quality. `hevc_videotoolbox` is Apple's hardware encoder path, so encoding runs on the ME block rather than the CPU and costs nothing on battery. The `-tag:v hvc1` flag is non-negotiable because QuickTime and Safari will refuse to play HEVC tagged with the MP4-standard `hev1`. `-q:v 65` is a VideoToolbox-specific quality target, not the typical 0 to 51 CRF scale.",
  },
  {
    q: "What triggers a chunk rotation before the 60-second mark?",
    a: "Two things. First, an aspect ratio shift: if the captured window or display changes shape by more than 20% (`aspectRatioChangeThreshold = 0.2`) and the new shape holds for 2 seconds (`aspectRatioStabilityDelay = 2.0`), the current chunk is finalized and a new one opens at the new dimensions. This prevents a squashed replay when someone tiles windows or switches displays. Second, ffmpeg health: after 5 consecutive encoder failures (`maxConsecutiveFailures = 5`) the SDK drops the frame buffer and spins up a fresh encoder, which also opens a new chunk file.",
  },
  {
    q: "What is in the `ChunkInfo.activeApps` manifest?",
    a: "For every chunk, a sorted array of `ActiveAppEntry` records, each with `appName`, `windowTitle`, and `frameCount`. It is built by tallying a `{appName}||{windowTitle}` key for every single frame that went into the chunk and sorting descending by count. For a 60-second chunk at 5 FPS that is 300 samples. The callback `onChunkReady(ChunkInfo)` fires with this manifest before the chunk is uploaded, so you can index a session by app and window title before the bytes ever leave the device.",
  },
  {
    q: "Can this SDK record a browser tab the same way Hotjar does?",
    a: "It records the browser window at the pixel level, which is different from what Hotjar does. Hotjar sees the DOM tree, so you can replay a session with live text selection, network waterfalls, and CSS classes. This SDK sees pixels, which means PDFs, canvas apps, WebGL, and cross-origin iframes all replay correctly, but you cannot inspect elements after the fact. If you need both, run a web replay tool inside the browser and this SDK at the desktop level; they collect complementary signals.",
  },
  {
    q: "Does the pipeline work with local-only storage if I do not want a cloud bucket?",
    a: "Yes. If `Config.backendURL` is left nil, the SDK runs entirely offline. Chunks are written to the local `ChunkStorage` tree at `{baseDirectory}/{sessionId}/Videos/{yyyy-MM-dd}/chunk_{HHmmss}.mp4` and never leave the disk. The `onChunkReady` callback still fires, so you can ship your own replication (S3, R2, a WebDAV share) or just hand the files to a local player. The web player in this repo reads directly from a GCS bucket; swapping that for a local file listing is a route-handler change rather than an SDK change.",
  },
  {
    q: "What permissions does the SDK ask for at runtime?",
    a: "Only Screen Recording, granted through System Settings > Privacy & Security > Screen & System Audio Recording. The SDK does not need Accessibility (it reads window metadata through `CGWindowList`, which sits under the Screen Recording grant). It does not need Input Monitoring, because it never reads keyboard or mouse events. TCC ties the grant to the binary's code signature and path, so an update that keeps the path and signature stable keeps the grant. Switching from a dev build to a notarized build usually invalidates the grant and the user will be prompted once.",
  },
  {
    q: "How does Gemini Vision analyze the recorded sessions?",
    a: "The web player's `/api/session-recordings/analyze` route accepts up to 60 chunks in one request (`MAX_CHUNKS = 60`, roughly one hour of replay), with a 20 MB cap per chunk. Chunks under 1.5 MB are passed to Gemini Pro inline as base64; larger chunks use Gemini's resumable File API, with a 120-second upload/processing timeout. The default prompt asks Gemini to identify the single most impactful task an AI agent could automate, rated by estimated 5x time savings. Custom prompts are supported via the request body. This is the bridge between raw pixel recordings and actionable AI insight.",
  },
];

const jsonLd = [
  articleSchema({
    headline:
      "Session replay tools for native macOS apps (why the web-DOM tools cannot record them)",
    description:
      "Guide to session replay tools for native macOS apps. Explains why browser-based replay (Hotjar, FullStory, LogRocket, PostHog, Microsoft Clarity) cannot record AppKit or SwiftUI windows, then walks through the open-source macOS-native SDK that uses ScreenCaptureKit at 5 FPS, `hevc_videotoolbox` hardware H.265, 60-second fragmented MP4 chunk rotation, and a per-frame `activeApps` manifest built from CGWindowList.",
    url: PAGE_URL,
    datePublished: PUBLISHED,
    author: "Matthew Diakonov",
    publisherName: "macOS Session Replay",
    publisherUrl: "https://macos-session-replay.com",
    articleType: "TechArticle",
  }),
  breadcrumbListSchema(breadcrumbSchemaItems),
  faqPageSchema(faqItems),
];

export default function SessionReplayToolsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="pb-24">
        <BackgroundGrid glow className="mx-4 md:mx-8 mt-8 px-6 py-16 md:py-24">
          <div className="max-w-4xl mx-auto relative z-10">
            <span className="inline-block bg-teal-50 text-teal-700 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6">
              session replay tools, native macOS edition
            </span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-6 leading-[1.05]">
              Session replay tools for{" "}
              <GradientText>native macOS apps</GradientText>, not the browser
            </h1>
            <p className="text-lg text-zinc-600 mb-8 max-w-2xl">
              Every roundup you find under this keyword compares the same ten browser SaaS, Hotjar, FullStory, LogRocket,
              Microsoft Clarity, PostHog, Mouseflow, Smartlook, and the rest. They all work by snapshotting the DOM of a
              web page. A native Swift window has no DOM, so not one of them can see what your macOS app actually did
              during a session.
            </p>
            <p className="text-lg text-zinc-600 mb-10 max-w-2xl">
              This guide covers the other category. It explains why the browser tools stop at the window boundary,
              then walks through the capture pipeline that does work on macOS, straight from the Swift source:
              ScreenCaptureKit at 5 FPS, <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">hevc_videotoolbox</code> hardware H.265,
              fragmented MP4 chunks rotated every 60 seconds, and a per-frame active-window manifest built from
              <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800"> CGWindowList</code> z-order.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <ShimmerButton href="#the-pipeline">Skip to the pipeline</ShimmerButton>
              <a
                href="https://github.com/m13v/macos-session-replay"
                className="text-sm font-medium text-teal-700 hover:text-teal-600"
              >
                View the SDK source &rarr;
              </a>
            </div>
          </div>
        </BackgroundGrid>

        <div className="mt-10">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
        <div className="mt-4 mb-8">
          <ArticleMeta
            datePublished={PUBLISHED}
            readingTime="11 min read"
            authorRole="maintainer of macos-session-replay"
          />
        </div>
        <ProofBand
          rating={4.9}
          ratingCount="open-source signals"
          highlights={[
            "Swift Package, ScreenCaptureKit + ffmpeg hevc_videotoolbox, not yet-another-JS-tag",
            "Exact encoder args pulled from VideoChunkEncoder.swift lines 226-242",
            "Per-chunk activeApps manifest built from CGWindowList z-order (layer-0 windows only)",
          ]}
        />

        <section className="max-w-4xl mx-auto px-6 my-16">
          <div className="rounded-3xl overflow-hidden border border-zinc-200 shadow-sm">
            <RemotionClip
              title="The browser tools stop at the window edge."
              subtitle="Session replay tools for native macOS apps"
              accent="teal"
              captions={[
                "Hotjar, FullStory, LogRocket: they all snapshot the DOM.",
                "A native AppKit or SwiftUI window has no DOM to snapshot.",
                "So we capture pixels from ScreenCaptureKit at 5 FPS.",
                "Hardware H.265 via hevc_videotoolbox, 60 second chunks.",
                "Every chunk carries an activeApps manifest from CGWindowList.",
              ]}
            />
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            Why every &ldquo;best session replay tools&rdquo; list misses macOS
          </h2>
          <p className="text-zinc-600 mb-4 leading-relaxed">
            The canonical session replay architecture is rrweb-shaped. A small JavaScript snippet loads inside a web
            page, subscribes to <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">MutationObserver</code>,
            <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800"> IntersectionObserver</code>, pointer events,
            console output, and network requests, and streams the delta to a backend. A replay
            player in the browser rebuilds the page from those deltas. Hotjar, FullStory, LogRocket, Microsoft Clarity,
            PostHog, Mouseflow, Smartlook, Satchel, Glassbox, Inspectlet: all variations on this.
          </p>
          <p className="text-zinc-600 mb-4 leading-relaxed">
            A native macOS app does not host any of those primitives. AppKit renders through CoreAnimation layers
            composited by WindowServer. SwiftUI sits on top of AppKit. Mac Catalyst apps still reach the compositor
            through UIKit. There is no DOM, no <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">document</code>,
            nothing for a rrweb-style snapshotter to attach to. The JS tag has no way to reach the process, and even if
            it did, there is nothing to observe.
          </p>
          <p className="text-zinc-600 mb-4 leading-relaxed">
            This is why, no matter how long the list of &ldquo;session replay tools&rdquo; gets, every entry is a browser
            tool. The category of <em>native macOS session replay</em> is essentially one item long, and it works at a
            totally different layer of the stack.
          </p>
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">
            The browser-replay tools that this page is <em>not</em> about
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            If you landed here looking for the standard SaaS roundup, here is the set. Each one works well inside its
            intended domain, and none of them are wrong. They just cannot see outside a browser tab:
          </p>
          <Marquee speed={40}>
            <div className="flex items-center gap-3 pr-3">
              {competitorMarquee.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center whitespace-nowrap rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm"
                >
                  {name}
                </span>
              ))}
            </div>
          </Marquee>
          <p className="text-sm text-zinc-500 mt-4 text-center max-w-2xl mx-auto">
            All of these are browser-DOM tools. For a sibling comparison to this page, any of their own &ldquo;alternatives&rdquo;
            pages does a decent job of ranking them against each other.
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            Four categories people call &ldquo;session replay,&rdquo; only one records macOS
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed">
            It helps to split the tooling into four buckets. Most SEO pages mash the first three together and ignore the
            fourth. The fourth is the only one with a meaningful answer for AppKit, SwiftUI, and Catalyst apps:
          </p>
          <BentoGrid cards={categoryBento} />
        </section>

        <section className="max-w-5xl mx-auto px-6 my-16">
          <AnimatedBeam
            title="What the macOS capture pipeline actually does"
            from={[
              { label: "ScreenCaptureKit", sublabel: "5 FPS, BGRA frames" },
              { label: "CGWindowList", sublabel: "z-order, layer 0" },
              { label: "Frontmost app PID", sublabel: "appName + windowTitle" },
            ]}
            hub={{ label: "VideoChunkEncoder", sublabel: "ffmpeg hevc_videotoolbox subprocess" }}
            to={[
              { label: "60 s fragmented .mp4", sublabel: "frag_keyframe+empty_moov" },
              { label: "ChunkInfo.activeApps", sublabel: "sorted by frame count" },
              { label: "GCS signed URL upload", sublabel: "1 h validity, PUT video/mp4" },
            ]}
          />
          <p className="text-sm text-zinc-500 mt-4 text-center max-w-2xl mx-auto">
            Left side is pure macOS framework calls. Middle is a long-lived ffmpeg child process. Right side is the
            deliverable: a .mp4 chunk plus its manifest, ready for a player or for Gemini Vision.
          </p>
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16" id="the-pipeline">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            The pipeline, end to end
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed">
            Six stages, each driven by a specific file in the SDK. Nothing is hypothetical; every step maps to a method
            on a real Swift actor:
          </p>
          <StepTimeline steps={pipelineSteps} />
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            The ffmpeg arguments that make macOS-native replay possible
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            This is the exact argv handed to <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">ffmpeg</code> for
            every chunk. It is the uncopyable part of the SDK, because swapping any of these flags breaks either
            QuickTime playback, streamability, or realtime encoding on a MacBook battery:
          </p>
          <AnimatedCodeBlock
            code={ffmpegArgsCode}
            language="swift"
            filename="Sources/SessionReplay/VideoChunkEncoder.swift"
          />
          <p className="text-zinc-600 mt-6 leading-relaxed">
            A few non-obvious notes. <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">hvc1</code> vs.
            <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800"> hev1</code> changes whether Safari and
            QuickTime will play the file, the answer is always <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">hvc1</code>.
            <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800"> -movflags frag_keyframe+empty_moov+default_base_moof</code> writes a fragmented MP4, which
            means the chunk is playable the moment the process exits, even if the <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">moov</code> atom never
            gets patched at the end. <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">-q:v 65</code> is a VideoToolbox-specific
            quality target, not a CRF value from <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">libx265</code>; copying
            it into a software encoder gives you nonsense.
          </p>
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            How the active window is detected, without Accessibility permission
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            The per-frame active-window lookup is what turns a pile of .mp4 files into something searchable by app and
            window title. The mechanism is a single <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">CGWindowList</code> call
            plus a small filter:
          </p>
          <AnimatedCodeBlock
            code={activeWindowCode}
            language="swift"
            filename="Sources/SessionReplay/ScreenCaptureService.swift"
          />
          <p className="text-zinc-600 mt-6 leading-relaxed">
            The <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">layer == 0</code> filter excludes the menubar,
            the Dock, and floating HUD panels. The <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">width &gt; 100 &amp;&amp; height &gt; 100</code> filter
            drops tooltips, sheets, and toast windows. What survives is the actual document or chat or inspector the
            user is looking at, and its title gets keyed into the manifest for this frame.
          </p>
        </section>

        <GlowCard className="max-w-4xl mx-auto px-6 my-16">
          <div className="p-8">
            <p className="text-xs font-mono uppercase tracking-widest text-teal-600 mb-3">
              anchor fact
            </p>
            <h3 className="text-2xl font-bold text-zinc-900 mb-3">
              <NumberTicker value={300} /> frames per chunk, one manifest, zero accessibility grants
            </h3>
            <p className="text-zinc-600 leading-relaxed">
              At <NumberTicker value={5} /> FPS across a <NumberTicker value={60} />-second window, each .mp4 chunk carries
              roughly <NumberTicker value={300} /> active-window samples, sorted descending by frame count and emitted to
              <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800"> onChunkReady(ChunkInfo)</code> before the upload
              begins. All of it is gated on the standard Screen Recording TCC grant, nothing reads keystrokes, nothing
              hooks into Accessibility. The SDK rotates chunks early when the capture aspect ratio changes by
              more than <NumberTicker value={20} />% and the new ratio holds for <NumberTicker value={2} /> seconds, so a
              display switch never leaves you with a squashed replay.
            </p>
          </div>
        </GlowCard>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            Config the SDK actually exposes
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            Every constant referenced above is a field on <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">SessionRecorder.Config</code>.
            Defaults are tuned so a typical MacBook produces roughly 120 to 300 MB of recording per hour and spends
            under 10% of a single CPU core on encoding:
          </p>
          <AnimatedCodeBlock
            code={configCode}
            language="swift"
            filename="Sources/SessionReplay/SessionRecorder.swift"
          />
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            What a chunk rotation looks like when a user tiles two windows
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            Generic screen recorders would keep the original frame size and stretch everything. The SDK instead finalizes
            the current chunk and opens a fresh one at the new aspect ratio as soon as the 2-second debounce clears. A
            trimmed debug trace of the event:
          </p>
          <TerminalOutput
            title="encoder log during a mid-session layout change"
            lines={chunkRotationTerminal}
          />
          <p className="text-zinc-600 mt-4 leading-relaxed">
            Note the <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">onChunkReady</code> line: two
            <code className="text-sm bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800"> activeApps</code> entries with their frame counts,
            ready to index before the file leaves the device.
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4 text-center">
            Web DOM replay vs. macOS pixel replay, side by side
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed text-center max-w-2xl mx-auto">
            The two categories are complements, not competitors. The table below is the fastest way to see which one
            fits the session you are trying to record:
          </p>
          <ComparisonTable
            productName="macOS Session Replay (pixel + manifest)"
            competitorName="Browser session replay (DOM snapshotting)"
            rows={webVsNativePipelineRows}
          />
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">
            The surface this actually covers
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            Because the capture happens at the WindowServer compositor layer, the same SDK records every window
            framework that renders on macOS. No per-app instrumentation, no per-framework shim, no code inside the target
            app:
          </p>
          <Marquee speed={30} reverse>
            <div className="flex items-center gap-3 pr-3">
              {nativeWindowsMarquee.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center whitespace-nowrap rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-800 shadow-sm"
                >
                  {name}
                </span>
              ))}
            </div>
          </Marquee>
        </section>

        <InlineCta
          heading="Want to wire this SDK into your own macOS app?"
          body="The package is one Swift file (SessionRecorder.swift) of surface area. Point it at your GCS bucket, set captureMode, call start(). There is also a local-only mode that never talks to a backend."
          linkText="Read the README"
          href="https://github.com/m13v/macos-session-replay"
        />

        <FaqSection items={faqItems} />
      </article>
    </>
  );
}
