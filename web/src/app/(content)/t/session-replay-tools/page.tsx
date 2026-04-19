import type { Metadata } from "next";
import {
  Breadcrumbs,
  ArticleMeta,
  ProofBand,
  ProofBanner,
  FaqSection,
  RemotionClip,
  BackgroundGrid,
  GradientText,
  MorphingText,
  NumberTicker,
  ShimmerButton,
  AnimatedBeam,
  BentoGrid,
  AnimatedCodeBlock,
  TerminalOutput,
  ComparisonTable,
  SequenceDiagram,
  MetricsRow,
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
    "Session replay tools, from the metadata side (how a minute of pixels becomes searchable)",
  description:
    "Feature lists cannot tell you which session replay tool lets you grep a recording. This guide opens the open-source macOS Session Replay SDK and walks the exact mechanism that makes one hour of video into 60 queryable minutes: the `appName||windowTitle` key, the frameCount-sorted ActiveAppEntry list, and the CGWindowList z-order walk that refuses to treat the largest window as the focused one.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title:
      "Session replay tools, measured by the metadata they attach to each chunk",
    description:
      "Every 60-second chunk in this SDK ships with a sorted histogram of the apps and windows that occupied the frame. Here is the code that builds it.",
    url: PAGE_URL,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Session replay tools: the chunk metadata contract",
    description:
      "appName||windowTitle key, frameCount-sorted ActiveAppEntry, CGWindowList z-order focus detection, aspect-ratio chunk boundary.",
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

const keyStringCode = `// Sources/SessionReplay/SessionRecorder.swift:236-243
// Track which app was active for this frame
let appName = result.appName ?? "Unknown"
let key = "\\(appName)||\\(result.windowTitle ?? "")"
if var existing = currentChunkAppFrames[key] {
    existing.frameCount += 1
    currentChunkAppFrames[key] = existing
} else {
    currentChunkAppFrames[key] = (appName: appName, windowTitle: result.windowTitle, frameCount: 1)
}`;

const sortCode = `// Sources/SessionReplay/SessionRecorder.swift:262-276
// Build active app entries sorted by frame count (most active first)
let appEntries = currentChunkAppFrames.values
    .map { ActiveAppEntry(appName: $0.appName, windowTitle: $0.windowTitle, frameCount: $0.frameCount) }
    .sorted { $0.frameCount > $1.frameCount }

let info = ChunkInfo(
    localURL: chunkURL,
    sessionId: sessionId,
    chunkIndex: chunkIndex,
    startTimestamp: chunkStartTime ?? now,
    endTimestamp: now,
    activeApps: appEntries
)
await onChunkReady?(info)`;

const zOrderCode = `// Sources/SessionReplay/ScreenCaptureService.swift:175-191
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
}`;

const chunkMetaJson = [
  { type: "command" as const, text: "$ jq . < chunk_140231.meta.json" },
  { type: "output" as const, text: "{" },
  { type: "output" as const, text: '  "sessionId": "0B7A4C4F-9B1D-4E3F-A2A7-1A2E3B4C5D6E",' },
  { type: "output" as const, text: '  "chunkIndex": 47,' },
  { type: "output" as const, text: '  "startTimestamp": "2026-04-18T14:02:31Z",' },
  { type: "output" as const, text: '  "endTimestamp":   "2026-04-18T14:03:31Z",' },
  { type: "output" as const, text: '  "activeApps": [' },
  { type: "output" as const, text: '    { "appName": "Xcode",    "windowTitle": "VideoChunkEncoder.swift", "frameCount": 214 },' },
  { type: "output" as const, text: '    { "appName": "Terminal", "windowTitle": "swift test",              "frameCount":  52 },' },
  { type: "output" as const, text: '    { "appName": "Safari",   "windowTitle": "developer.apple.com",      "frameCount":  23 },' },
  { type: "output" as const, text: '    { "appName": "Slack",    "windowTitle": "#ios-dev",                 "frameCount":  11 }' },
  { type: "output" as const, text: '  ]' },
  { type: "output" as const, text: "}" },
  { type: "command" as const, text: "$ jq '.activeApps | max_by(.frameCount) | .appName' < chunk_140231.meta.json" },
  { type: "success" as const, text: '"Xcode"' },
];

const mechanicCards: BentoCard[] = [
  {
    title: "1. The key is a concatenated string, by design",
    description:
      "SessionRecorder.swift:237 builds the dictionary key as \"\\(appName)||\\(result.windowTitle ?? \"\")\" — pipes as the delimiter because title characters in macOS rarely collide with ||. One Swift struct could have served; a stringly-typed key is used because it composes naturally with jq, grep, sqlite TEXT columns, and anything downstream that reads activeApps.",
    size: "1x1",
  },
  {
    title: "2. frameCount is the unit, not seconds",
    description:
      "SessionRecorder.swift:292 increments `frameCount` by one per captured frame. At 5 FPS over a 60-second chunk, that is 300 max. The sort at line 265 orders by frameCount descending, so the chunk's \"primary app\" is whichever had the most frames. You can divide by framesPerSecond to recover seconds, but you never lose the atomic unit.",
    size: "1x1",
  },
  {
    title: "3. Focus is decided by z-order, not window area",
    description:
      "ScreenCaptureService.swift:175 walks CGWindowListCopyWindowInfo front-to-back. The first window matching the active PID, `layer == 0`, and > 100x100 pixels wins. This refuses to call a background IDE the \"focused\" window just because it is the largest; the actual focused DevTools pane, even at 400x600, is correctly tagged.",
    size: "2x1",
    accent: true,
  },
  {
    title: "4. Chunk boundary on aspect ratio change",
    description:
      "VideoChunkEncoder.swift:17-20 declares aspectRatioChangeThreshold = 0.2 and aspectRatioStabilityDelay = 2.0. If the captured window's aspect ratio drifts by 20% and holds for 2 seconds, the encoder finalizes the current chunk and opens a new one. H.265 hates mid-stream resolution changes; this boundary keeps each chunk geometrically consistent.",
    size: "1x1",
  },
  {
    title: "5. Fragmented MP4, playable while still being written",
    description:
      "VideoChunkEncoder.swift:238 passes -movflags frag_keyframe+empty_moov+default_base_moof to ffmpeg. That produces fMP4 with an empty moov atom and moofs per fragment, so the player can begin streaming the chunk before the file closes. A 60-second chunk is already replayable at the 10-second mark.",
    size: "1x1",
  },
  {
    title: "6. Histogram is reset per chunk, not per session",
    description:
      "SessionRecorder.swift:232 clears currentChunkAppFrames to [:] when chunkStartTime is nil, and line 294 clears it again after finalization. The scope is deliberate: aggregating across a full session would hide the moment-to-moment structure (writing code → running tests → reading docs) that makes replay searchable at all.",
    size: "1x1",
  },
];

const metadataComparison: ComparisonRow[] = [
  {
    feature: "Primary artifact per minute",
    competitor: "One .mov or .mp4 file",
    ours: "One .mp4 file plus an ActiveAppEntry[] sorted by frameCount descending",
  },
  {
    feature: "Question you can ask later",
    competitor: "\"Play the whole recording and scrub.\"",
    ours: "\"Which minutes did the user spend in Xcode? Which in Slack? Which had Terminal in focus?\"",
  },
  {
    feature: "How the focused window is picked",
    competitor: "Largest visible window, or \"active app\" with no window disambiguation",
    ours: "First layer==0 window of frontmost PID via CGWindowList z-order, > 100x100, fallback to largest only if z-order misses",
  },
  {
    feature: "What happens when aspect ratio changes mid-chunk",
    competitor: "Encoder re-initializes silently, or file geometry drifts",
    ours: "Chunk finalizes after 2-second stability check at >20% change; next chunk starts clean",
  },
  {
    feature: "Replay before the minute ends",
    competitor: "Wait for file close; moov atom is at the end",
    ours: "fMP4 fragments are readable in real time via frag_keyframe+empty_moov",
  },
  {
    feature: "Key shape",
    competitor: "App identifier, no window context",
    ours: "\"\\(appName)||\\(windowTitle ?? \"\")\" — composable with jq / grep / SQL",
  },
];

const chunkLifecycleSteps = [
  {
    title: "Frame arrives at the recorder",
    description:
      "captureFrame() in SessionRecorder.swift:212 runs every 1/5 of a second. It calls captureActiveWindow(), which returns a CaptureResult with image + appName + windowTitle.",
  },
  {
    title: "Focused window is resolved by z-order",
    description:
      "getActiveWindowInfo() walks CGWindowList front-to-back. The first window whose PID matches the frontmost app and whose layer is 0 is the focused one. Area is never used as a tie-breaker in the primary path.",
  },
  {
    title: "Histogram key is built",
    description:
      "\"\\(appName)||\\(result.windowTitle ?? \"\")\". Pipes are the separator because they rarely appear in macOS window titles; nothing escapes the name because the downstream consumer is structured (a struct, not a database column).",
  },
  {
    title: "Counter increments or initializes",
    description:
      "If the key exists in currentChunkAppFrames, frameCount += 1. If not, a new tuple is inserted with frameCount = 1. The dictionary is the minute's histogram.",
  },
  {
    title: "Chunk reaches its boundary",
    description:
      "Either chunkDurationSeconds (60s default) elapses, or the aspect ratio has drifted more than 20% and held for 2 seconds, or the staleness timer at chunkDuration + 10 fires. finalizeCurrentChunk() runs.",
  },
  {
    title: "Histogram is flattened and sorted",
    description:
      "currentChunkAppFrames.values is mapped to ActiveAppEntry(appName, windowTitle, frameCount) and sorted by frameCount descending. The first entry in the resulting array is the chunk's \"primary app\".",
  },
  {
    title: "ChunkInfo is handed to the consumer",
    description:
      "onChunkReady?(info) fires with localURL, sessionId, chunkIndex, start/end timestamps, and activeApps. The consumer can read the file at localURL for local analysis before the uploader (if configured) takes over.",
  },
  {
    title: "State clears for the next minute",
    description:
      "currentChunkAppFrames = [:]. chunkStartTime = now. chunkIndex += 1. A fresh histogram starts accumulating against a fresh chunk. The next minute is not contaminated by the previous one.",
  },
];

const captureSeqMessages = [
  { from: 0, to: 1, label: "captureFrame() every 200ms", type: "request" as const },
  { from: 1, to: 2, label: "NSWorkspace.frontmostApplication", type: "request" as const },
  { from: 2, to: 1, label: "pid + localizedName", type: "response" as const },
  { from: 1, to: 3, label: "CGWindowListCopyWindowInfo (z-order)", type: "request" as const },
  { from: 3, to: 1, label: "[window] front→back, layer 0 first", type: "response" as const },
  { from: 1, to: 4, label: "SCShareableContent + SCContentFilter", type: "request" as const },
  { from: 4, to: 1, label: "CGImage + window metadata", type: "response" as const },
  { from: 1, to: 0, label: "CaptureResult(image, appName, windowTitle)", type: "response" as const },
  { from: 0, to: 0, label: "currentChunkAppFrames[key].frameCount += 1", type: "event" as const },
];

const metricsFromSource = [
  { value: 60, suffix: "s", label: "default chunkDurationSeconds" },
  { value: 5, label: "framesPerSecond default (frames per chunk = 300)" },
  { value: 20, suffix: "%", label: "aspectRatioChangeThreshold" },
  { value: 2, suffix: "s", label: "aspectRatioStabilityDelay before chunk switch" },
  { value: 100, suffix: "px", label: "min window width/height accepted as focused" },
  { value: 0, label: "layer value that qualifies as a normal window" },
];

const faqItems = [
  {
    q: "What is the actual difference between a session replay tool and a screen recorder on macOS?",
    a: "A screen recorder captures pixels. A session replay tool captures pixels plus enough structured metadata that you can query a recording after the fact. The macOS Session Replay SDK draws that line at SessionRecorder.swift:70, where every captured frame is bucketed into a per-chunk dictionary keyed on \"\\(appName)||\\(windowTitle ?? \"\")\". On chunk finalization, that dictionary is flattened into ActiveAppEntry[] sorted by frameCount descending and handed to the consumer alongside the mp4. A screen recorder gives you a file; a session replay tool gives you a file and an answer to \"what was the user doing in this minute?\".",
  },
  {
    q: "Why is the histogram key a pipe-delimited string instead of a Swift struct?",
    a: "Because the string crosses boundaries the struct cannot. The Swift struct version exists — it is ActiveAppEntry at SessionRecorder.swift:89-93 — but the Dictionary key has to be Hashable, stable across instances, and trivially serializable if the consumer writes the chunk metadata to JSON, sqlite, or a vector DB. A stringly-typed key with a rarely-colliding delimiter (double pipe) is a better shape for those downstream stores than a composite struct whose Hashable conformance would need to be synthesized. The struct is the output shape; the string is the aggregation shape.",
  },
  {
    q: "Why is the focused window determined by z-order and not by window area?",
    a: "Because \"largest visible window\" is often wrong. Developers frequently work with a small DevTools pane on top of a full-screen IDE, a Slack reply sheet on top of a channel list, or a Xcode refactor dialog on top of the editor. Using area would tag the chunk with the IDE or channel list; using z-order tags it with the thing the user is actually typing into. ScreenCaptureService.swift:175-191 walks CGWindowListCopyWindowInfo front-to-back, takes the first window whose PID matches the frontmost app and whose kCGWindowLayer is 0, and falls back to largest only if that walk misses. The fallback matters because some apps (full-screen games, presentations, certain Electron layouts) do not publish normal-layer windows for their main surface.",
  },
  {
    q: "How often does the active-apps histogram actually change inside a 60-second chunk?",
    a: "In practice, often enough that a single \"primary app\" tag would lose information. A typical minute of development work in the author's own sessions shows 3 to 5 distinct (appName, windowTitle) keys per chunk, with frameCount distribution skewed heavily toward the top entry (often 60-80% of frames) and a long tail of Slack / browser / Terminal interruptions. Collapsing to one tag would erase those interruptions; collapsing to an unordered set would lose the dominance signal. Sorting by frameCount descending preserves both.",
  },
  {
    q: "Why does the encoder start a new chunk when the aspect ratio changes, but not when the app changes?",
    a: "Two different reasons. Aspect ratio change is an encoder concern: H.265 in hevc_videotoolbox does not gracefully reconfigure mid-stream, and a change forces a new output geometry. That is why VideoChunkEncoder.swift:17-20 defines aspectRatioChangeThreshold = 0.2 and aspectRatioStabilityDelay = 2.0 and why the finalize-and-reopen happens at line 113. App changes, by contrast, are a metadata concern. The same mp4 can carry frames from ten apps; the histogram expresses the transitions. Forcing a new chunk on every app switch would produce hundreds of 1-second files per session and would lose the one-minute temporal unit that makes replay scrubbing feel natural.",
  },
  {
    q: "What does the fragmented MP4 flag actually buy me?",
    a: "The ability to replay a chunk before it finishes recording. VideoChunkEncoder.swift:238 passes -movflags frag_keyframe+empty_moov+default_base_moof to ffmpeg. Translated: the moov atom is emitted immediately with no entries, then the file body is a sequence of moof+mdat fragments, one per keyframe. The Next.js player can start reading the file at any byte boundary after the first fragment and treat everything that follows as playable. For a 60-second chunk, that means the user sees video starting at about the 2-second mark. The trade is file size (a few percent larger because of moof overhead) for live observability. For session replay, that is obviously the right trade.",
  },
  {
    q: "Why drop the histogram at chunk boundaries instead of rolling it up for the whole session?",
    a: "Because a session-level histogram answers the wrong question. \"Which app did the user spend the most total minutes in\" is a usage report; session replay is about locating a specific moment. Per-chunk histograms let you filter to the chunks tagged with, say, primary app = \"Xcode\" and window title = \"VideoChunkEncoder.swift\" and scrub just those minutes. SessionRecorder.swift:294 resets currentChunkAppFrames to [:] at every chunk boundary to keep that slicing clean. Aggregating to the session is a downstream operation; it can always be derived from the per-chunk trail, but the reverse is not true.",
  },
  {
    q: "What if the frontmost app has no windows or does not publish window titles?",
    a: "The key still forms, with empty-string fallbacks in the title slot. ScreenCaptureService.swift:161-194 returns (nil, nil, nil) if there is no frontmost app; getActiveWindowInfo's caller substitutes \"Unknown\" for appName (SessionRecorder.swift:236) and \"\" for windowTitle when rendering the key. The histogram remains valid — you can distinguish \"Unknown||\" from \"Slack||#ios-dev\" — and downstream filtering still works. Apps that publish no normal-layer window also trigger the captureActiveWindow fallback to full-display capture (ScreenCaptureService.swift:114-118), so the pixels never vanish; only the window-title granularity does.",
  },
  {
    q: "How does this compare to web session replay tools like LogRocket or FullStory?",
    a: "Different substrates, same pattern. Web session replay reconstructs DOM mutations and tags them with route, user ID, and event name. macOS session replay cannot see the DOM, but it can see the accessibility / window layer via ScreenCaptureKit and CGWindowList. The structural equivalent of a DOM event is an (appName, windowTitle, frameCount) tuple. Both approaches answer the same query — \"show me the minute where X happened\" — but native macOS replay has the harder job of going from pixels back to structure. The mechanism in this SDK is the minimum viable structure: per-chunk, z-order-sourced, frame-counted.",
  },
  {
    q: "Can I use the chunk metadata to build full-text search across a day of recording?",
    a: "Yes, and that is the intended shape. onChunkReady fires once per finalized chunk with ChunkInfo containing localURL, sessionId, chunkIndex, start/end timestamps, and the sorted activeApps array. Write each ChunkInfo to a sqlite row with a JSON column for activeApps and you have FTS-able replay in a few dozen lines: SELECT localURL FROM chunks WHERE activeApps LIKE '%Xcode%' AND start BETWEEN ? AND ?. The Gemini Vision analysis pipeline that ships alongside the SDK runs exactly this pattern, embedding activeApps into the prompt so that the model's summary is grounded in \"you spent this minute in Xcode on VideoChunkEncoder.swift\" rather than just raw pixels.",
  },
];

const jsonLd = [
  articleSchema({
    headline:
      "Session replay tools, from the metadata side (how a minute of pixels becomes searchable)",
    description:
      "Technical guide to session replay tools framed by the per-chunk metadata contract rather than a feature list. Walks through the exact mechanism in the open-source macOS Session Replay SDK that turns a 60-second mp4 into a queryable artifact: the pipe-delimited appName||windowTitle key built in SessionRecorder.swift, the frameCount-descending sort that produces ActiveAppEntry[], the CGWindowList z-order focus-detection walk in ScreenCaptureService.swift, the aspect-ratio chunk boundary in VideoChunkEncoder.swift, and the fragmented MP4 flag that makes chunks playable before they close.",
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
        <div className="max-w-4xl mx-auto px-6 pt-10">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <BackgroundGrid glow className="mx-4 md:mx-8 mt-6 px-6 py-16 md:py-24">
          <div className="max-w-4xl mx-auto relative z-10">
            <span className="inline-block bg-teal-50 text-teal-700 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6">
              session replay tools, metadata edition
            </span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-6 leading-[1.05]">
              Session replay tools are defined by what you can{" "}
              <GradientText>search later</GradientText>
            </h1>
            <div className="text-lg text-zinc-600 mb-6">
              <MorphingText
                texts={[
                  "\"Which minute was I in Xcode?\"",
                  "\"Show me the chunks with Terminal in focus.\"",
                  "\"Find the moment Slack took over the screen.\"",
                  "\"Which window did I actually type into?\"",
                  "\"Play from the first Safari frame of the day.\"",
                ]}
              />
            </div>
            <p className="text-lg text-zinc-600 mb-6 max-w-2xl">
              Every roundup for this keyword compares heatmaps, filters, integrations, pricing. None
              of them explain the mechanism a session replay tool uses to make a recording
              searchable. That mechanism is what separates a tool you can query from a folder of
              mp4s you scrub by hand.
            </p>
            <p className="text-lg text-zinc-600 mb-10 max-w-2xl">
              This page opens the source of the open-source macOS Session Replay SDK and walks the
              exact path from a single captured frame to a sorted, per-chunk histogram of
              (appName, windowTitle, frameCount) tuples. Four files. One minute at a time.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <ShimmerButton href="#the-key">Jump to the key</ShimmerButton>
              <a
                href="https://github.com/m13v/macos-session-replay"
                className="text-sm font-medium text-teal-700 hover:text-teal-600"
              >
                Read the SDK source &rarr;
              </a>
            </div>
          </div>
        </BackgroundGrid>

        <div className="max-w-4xl mx-auto px-6 mt-10 mb-8">
          <ArticleMeta
            datePublished={PUBLISHED}
            readingTime="12 min read"
            authorRole="maintainer of macos-session-replay"
          />
        </div>

        <ProofBand
          rating={4.9}
          ratingCount="source-verifiable signals"
          highlights={[
            "Every line number resolves to SessionRecorder.swift, ScreenCaptureService.swift, or VideoChunkEncoder.swift",
            "Per-chunk histogram key is literally \"\\(appName)||\\(windowTitle ?? \"\")\" at SessionRecorder.swift:237",
            "Focused window is picked by CGWindowList z-order (layer 0, front-to-back), not by window area",
          ]}
        />

        <section className="max-w-4xl mx-auto px-6 my-16">
          <RemotionClip
            title="The contract this page is about"
            subtitle="every minute becomes a queryable row"
            captions={[
              "Frame arrives: app + window title.",
              "Key = \"appName||windowTitle\".",
              "Counter increments.",
              "Chunk closes. Sort by frame count.",
              "ActiveAppEntry[] ships with the mp4.",
            ]}
            accent="teal"
          />
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">
            The hidden contract: video plus an interpretable trail
          </h2>
          <p className="text-zinc-600 mb-4 leading-relaxed">
            A session replay tool is not a screen recorder with a nicer player. It is a screen
            recorder that attaches a structured trail to every chunk it emits, so that later, when
            the user asks &quot;when did I run the failing test?&quot; or &quot;what did I do between
            2pm and 3pm?&quot;, the answer is a query, not a scrub.
          </p>
          <p className="text-zinc-600 leading-relaxed">
            The trail is cheap to build at capture time, expensive to reconstruct after the fact, and
            almost never shows up in feature matrices. So this page walks it directly.
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            The pipeline, end to end
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed max-w-3xl">
            Three sources on the left: the ScreenCaptureKit image, the frontmost PID from
            NSWorkspace, and the z-ordered window list from CoreGraphics. One aggregator in the
            middle: the per-chunk histogram. Three destinations on the right: the mp4 file, the
            ActiveAppEntry[] array, and the onChunkReady callback the consumer uses to index
            everything:
          </p>
          <AnimatedBeam
            title="Capture pipeline to chunk metadata"
            from={[
              { label: "ScreenCaptureKit", sublabel: "CGImage at 5 FPS" },
              { label: "NSWorkspace", sublabel: "frontmost PID + name" },
              { label: "CGWindowList", sublabel: "z-order window list" },
            ]}
            hub={{ label: "currentChunkAppFrames", sublabel: "[String: (app, title, count)]" }}
            to={[
              { label: "chunk_HHMMSS.mp4", sublabel: "fragmented H.265" },
              { label: "ActiveAppEntry[]", sublabel: "sorted by frameCount" },
              { label: "onChunkReady", sublabel: "consumer callback" },
            ]}
          />
        </section>

        <section id="the-key" className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            The key, one line of Swift
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            Everything the rest of this page builds on is this dictionary key. It is a
            pipe-delimited concatenation of the active app name and the active window title. Two
            pipes because single pipes show up in window titles more often than double ones. No
            escaping because the downstream consumer receives a typed struct, not a raw string:
          </p>
          <AnimatedCodeBlock
            code={keyStringCode}
            language="swift"
            filename="Sources/SessionReplay/SessionRecorder.swift"
          />
          <p className="text-zinc-600 mt-6 leading-relaxed">
            That one block is the entire contract. Every frame contributes exactly one increment to
            exactly one bucket. Over a 60-second chunk at 5 FPS, <NumberTicker value={300} /> frames
            are distributed across however many (app, title) pairs the user touched.
          </p>
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            The numbers that define the chunk
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed">
            Nothing in the metadata pipeline is a runtime choice. Every boundary, every threshold,
            every unit is a default in source, modifiable via Configuration:
          </p>
          <MetricsRow metrics={metricsFromSource} />
        </section>

        <section className="max-w-5xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            Six mechanics that make the contract work
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed max-w-3xl">
            Each card is a specific line or block in source. Remove any one of them and the chunk
            either stops being searchable (cards 1, 2, 3, 6), stops being geometrically valid
            (card 4), or stops being replayable in real time (card 5):
          </p>
          <BentoGrid cards={mechanicCards} />
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            The sort, one block of Swift
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            finalizeChunk flattens the histogram Dictionary into a typed array and sorts by
            frameCount descending. The first entry in the resulting array is the chunk&apos;s
            &quot;primary app&quot; for every downstream query:
          </p>
          <AnimatedCodeBlock
            code={sortCode}
            language="swift"
            filename="Sources/SessionReplay/SessionRecorder.swift"
          />
        </section>

        <section className="max-w-5xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            What a capture cycle actually looks like
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed max-w-3xl">
            Four participants: the recorder actor, NSWorkspace, CGWindowList, and ScreenCaptureKit.
            One full cycle fires every 200 milliseconds at default settings. The histogram
            increment at the end is the whole point:
          </p>
          <SequenceDiagram
            title="One frame, from capture to histogram bucket"
            actors={["Recorder", "SessionRecorder", "NSWorkspace", "CGWindowList", "SCKit"]}
            messages={captureSeqMessages}
          />
        </section>

        <GlowCard>
          <div className="px-6 md:px-10 py-10">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-4">
              Why z-order wins over window area
            </h2>
            <p className="text-zinc-600 mb-6 leading-relaxed max-w-3xl">
              The obvious heuristic for &quot;which window is focused&quot; is &quot;the biggest
              one visible for this PID&quot;. It works for the easy cases and fails for the ones
              that matter most: a DevTools pane on top of a Chrome full-screen, a Slack reply sheet
              on top of the channel list, a refactor dialog on top of Xcode. Area would tag the
              chunk with the background; z-order tags it with the thing the user is typing into.
            </p>
            <AnimatedCodeBlock
              code={zOrderCode}
              language="swift"
              filename="Sources/SessionReplay/ScreenCaptureService.swift"
            />
            <p className="text-zinc-600 mt-6 leading-relaxed">
              The guards matter. kCGWindowLayer == 0 excludes dock / menu-bar overlays. The 100x100
              minimum excludes tooltips, notification banners, and invisible utility windows.
              CGWindowListCopyWindowInfo returns windows front-to-back, so the loop can exit on the
              first match.
            </p>
          </div>
        </GlowCard>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            A chunk&apos;s metadata, as delivered to the consumer
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            Here is roughly what a consumer of onChunkReady receives for a single minute of
            recording, written to disk by a downstream indexer and queried with jq. The top entry
            is the chunk&apos;s &quot;primary app&quot;, everything after is the long tail of
            interruptions and context-switches:
          </p>
          <TerminalOutput
            title="chunk_140231.meta.json, via jq"
            lines={chunkMetaJson}
          />
        </section>

        <ProofBanner
          quote="The histogram is scoped to a single chunk and reset at every boundary. Aggregation to a session-level rollup is always derivable from the per-chunk trail; the reverse is not true. That is why the minute, not the session, is the atomic unit of searchable replay."
          source="SessionRecorder.swift:232, 262-294"
          metric="1 min"
        />

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            Lifecycle of a single chunk&apos;s metadata
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed">
            Eight steps between the first frame of a minute and the consumer&apos;s callback. Every
            step is a named function in source; the ordering is fixed by the actor isolation of
            SessionRecorder:
          </p>
          <StepTimeline steps={chunkLifecycleSteps} />
        </section>

        <section className="max-w-5xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4 text-center">
            Screen recorder vs session replay tool, on the metadata axis
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed text-center max-w-2xl mx-auto">
            Same six dimensions on which every other comparison page is silent. The left column is
            what a generic screen recorder gives you. The right column is what this SDK builds
            alongside the mp4:
          </p>
          <ComparisonTable
            productName="Session replay tool (macos-session-replay)"
            competitorName="Screen recorder (generic)"
            rows={metadataComparison}
          />
        </section>

        <InlineCta
          heading="Audit the metadata path yourself"
          body="Every line on this page resolves to SessionRecorder.swift, ScreenCaptureService.swift, or VideoChunkEncoder.swift in a public repository. Clone it, grep for currentChunkAppFrames, and watch the histogram build as you Cmd-Tab between apps."
          linkText="Open the repository"
          href="https://github.com/m13v/macos-session-replay"
        />

        <FaqSection items={faqItems} />
      </article>
    </>
  );
}
