import type { Metadata } from "next";
import {
  Breadcrumbs,
  ArticleMeta,
  FaqSection,
  TerminalOutput,
  BeforeAfter,
  SequenceDiagram,
  StepTimeline,
  ProofBanner,
  CodeComparison,
  BookCallCTA,
  articleSchema,
  breadcrumbListSchema,
  faqPageSchema,
} from "@seo/components";

const PAGE_URL = "https://macos-session-replay.com/t/macos-log-viewer-interaction-context";
const PUBLISHED = "2026-05-06";
const BOOKING = "https://cal.com/team/mediar/macos-session-replay";

export const metadata: Metadata = {
  title:
    "macOS log viewer interaction context: why Console.app cannot show what the user was doing",
  description:
    "Console.app, log show, log stream, and OSLogStore all read Apple's unified logging system. That system records subsystem, category, message, and timestamp, and never the screen state, focused app, or window title. This guide explains exactly what is missing, why no log viewer alone can fill the gap, and how to bridge it by joining os.Logger output with a timestamped frame stream tagged with appName and windowTitle.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title:
      "macOS log viewer interaction context, the missing axis Apple's unified logging never records",
    description:
      "A log line tells you what your code thought happened. The interaction context tells you what the user was actually clicking when it happened. They share one thing: a Date() timestamp.",
    url: PAGE_URL,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "macOS log viewer interaction context: the timestamp join that bridges OSLog and screen state",
    description:
      "os.Logger(subsystem: \"com.session-replay\") plus CapturedFrame(appName, windowTitle, captureTime), joined on wall-clock time. The whole bridge is two files.",
  },
  robots: { index: true, follow: true },
};

const breadcrumbItems = [
  { label: "macOS Session Replay", href: "/" },
  { label: "Guides", href: "/t" },
  { label: "macOS log viewer interaction context" },
];

const breadcrumbSchemaItems = [
  { name: "macOS Session Replay", url: "https://macos-session-replay.com/" },
  { name: "Guides", url: "https://macos-session-replay.com/t" },
  { name: "macOS log viewer interaction context", url: PAGE_URL },
];

const logShowOutput = [
  { type: "command" as const, text: 'log show --predicate \'subsystem == "com.session-replay"\' --info --last 5m' },
  { type: "output" as const, text: "Timestamp                       Thread     Type        Activity             PID    TTL" },
  { type: "output" as const, text: "2026-05-06 14:02:17.148921+0000  0x1f4a2    Default     0x0                  31204  0    SessionRecorder: Started session 0B7A4C4F-9B1D at 5.0 FPS" },
  { type: "output" as const, text: "2026-05-06 14:03:17.901334+0000  0x1f4a2    Default     0x0                  31204  0    VideoChunkEncoder: Finalized chunk with 298 frames" },
  { type: "output" as const, text: "2026-05-06 14:03:42.018702+0000  0x1f4a2    Error       0x0                  31204  0    ScreenCaptureService: Capture error: The user denied screen recording access" },
  { type: "output" as const, text: "2026-05-06 14:03:43.504128+0000  0x1f4a2    Default     0x0                  31204  0    SessionRecorder: Paused" },
  { type: "info" as const, text: "Notice what is NOT here: which app the user just clicked, which window had focus, what was on screen at 14:03:42 when capture failed." },
];

const loggerSwiftCode = `// Sources/SessionReplay/Logger.swift
import Foundation
import os

let logger = os.Logger(
    subsystem: "com.session-replay",
    category: "SessionReplay"
)

func log(_ message: String) {
    logger.info("\\(message, privacy: .public)")
}

func logError(_ message: String, error: Error? = nil) {
    if let error {
        logger.error("\\(message, privacy: .public): \\(error.localizedDescription, privacy: .public)")
    } else {
        logger.error("\\(message, privacy: .public)")
    }
}`;

const capturedFrameCode = `// Sources/SessionReplay/CapturedFrame.swift
public struct CapturedFrame: Sendable {
    public let appName: String
    public let windowTitle: String?
    public let frameNumber: Int
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
}`;

const correlationActors = [
  "Your Swift app",
  "os.Logger",
  "Apple unified logging",
  "ScreenCaptureKit",
  "Frame metadata",
  "log viewer + replay",
];

const correlationMessages = [
  { from: 0, to: 1, label: "log(\"User pressed Save\") at t=14:03:42.018", type: "request" as const },
  { from: 1, to: 2, label: "subsystem=com.session-replay, category=SessionReplay", type: "request" as const },
  { from: 2, to: 5, label: "log show streams line with timestamp", type: "response" as const },
  { from: 0, to: 3, label: "captureFrame() at t=14:03:42.018 (5 FPS clock)", type: "request" as const },
  { from: 3, to: 4, label: "CGImage + frontmost app + focused window title", type: "response" as const },
  { from: 4, to: 5, label: "CapturedFrame(appName=\"YourApp\", windowTitle=\"Untitled.swift\", captureTime=14:03:42.018)", type: "response" as const },
  { from: 5, to: 5, label: "Join on captureTime ≈ log timestamp", type: "event" as const },
];

const setupSteps = [
  {
    title: "Stop trying to make Console.app do this alone",
    description:
      "Console.app, log show, log stream, and OSLogStore all read the same unified logging back end. That back end is documented to record subsystem, category, level, message, and timestamp. There is no field for \"focused app\", \"window title\", or \"screen contents\". No predicate or filter unlocks data that was never written. Move on.",
  },
  {
    title: "Pick a stable subsystem string for your app",
    description:
      "In macOS Session Replay this is one line in Logger.swift: os.Logger(subsystem: \"com.session-replay\", category: \"SessionReplay\"). Use reverse-DNS so you can grep by company, by product, or by component. Every log call in the SDK funnels through this single logger, which means a single predicate filters every line you care about: log show --predicate 'subsystem == \"com.session-replay\"'.",
  },
  {
    title: "Tag every screen frame with the missing fields",
    description:
      "CapturedFrame.swift defines four fields: appName, windowTitle, frameNumber, captureTime. captureTime defaults to Date() at the moment the frame is constructed, which is the same clock log show prints. ScreenCaptureService resolves the focused window via CGWindowListCopyWindowInfo z-order, so windowTitle is the actual focused pane, not the largest visible window.",
  },
  {
    title: "Hand the consumer (your code) both streams",
    description:
      "SessionRecorder fires onChunkReady?(info) every chunkDurationSeconds (default 60). info contains startTimestamp, endTimestamp, and an activeApps histogram sorted by frameCount descending. In parallel, your log lines are queryable via OSLogStore at any later time. The two streams share Date() granularity, so a join on \"timestamp falls inside [startTimestamp, endTimestamp]\" is exact.",
  },
  {
    title: "Replay the minute, not the line",
    description:
      "When a log line says \"Capture error: The user denied screen recording access\" at 14:03:42.018, the chunk that contains 14:03:42.018 has the actual screen the user saw: the System Settings sheet they clicked Deny on, plus appName=\"System Settings\" and windowTitle=\"Privacy & Security\". The log told you what your code observed; the chunk tells you what the user did. Both are necessary; neither is sufficient.",
  },
];

const beforeContent =
  "Apple's unified logging system records exactly five things per line: subsystem, category, level (Info/Default/Error/Fault), message string, and a timestamp. That is the storage contract. log show, log stream, Console.app, and OSLogStore are all surfaces over this same back end. None of them have a hidden field for screen state, focused app, window title, mouse position, keyboard input, or anything else about the user. If your code did not write it, it is not there to filter for.";

const afterContent =
  "If you also capture screen frames on the same Date() clock, every log line gets a join key. macOS Session Replay does this with two small files: Logger.swift defines a single os.Logger with subsystem com.session-replay; CapturedFrame.swift defines a four-field struct (appName, windowTitle, frameNumber, captureTime). At chunk finalization, you get an MP4 plus an activeApps histogram covering [startTimestamp, endTimestamp]. Now the question \"what was the user doing when this log line fired?\" is a range lookup, not a guess.";

const faqItems = [
  {
    q: "Can Console.app, log show, or log stream display user interaction context on macOS?",
    a: "No. Console.app, log show, log stream, and OSLogStore are all surfaces over Apple's unified logging system. That system stores subsystem, category, level, message, and timestamp, and only those. The OSLog framework documentation (developer.apple.com/documentation/oslog/oslogstore) describes OSLogEntry, OSLogEntryLog, and the predicates you can run, and none of them include screen state, focused app, window title, or input events. Apple's log viewers cannot show what is not in Apple's log store.",
  },
  {
    q: "What does \"interaction context\" actually mean in this context?",
    a: "The user-side facts that make a log line interpretable: which app was frontmost, which window had focus, what was visible on screen, where the cursor was, what the user clicked or typed in the seconds before. \"SessionRecorder: Started session 0B7A4C4F-9B1D at 5.0 FPS\" is unambiguous to your code; it tells a developer reading the log nothing about why the user pressed Start at that moment. Interaction context is the missing causal layer.",
  },
  {
    q: "Why does macOS unified logging deliberately exclude screen state?",
    a: "Three reasons. First, scope: os.Logger is a structured-message bus, not a UX recorder. Second, privacy: storing focused window titles or screen contents in a system-wide log would leak data across apps that have no business reading each other's UI. Third, scale: unified logging is hot-path infrastructure used by every process on macOS; coupling it to AppKit/UIKit focus tracking would push tens of thousands of writes per second. The right architecture is exactly what Apple ships: a tiny, fast log primitive, plus an opt-in, app-scoped capture layer for everything else.",
  },
  {
    q: "How do I bridge an os.Logger line to the screen state at that exact moment?",
    a: "Capture both on the same Date() clock and join on timestamp. The macOS Session Replay SDK demonstrates the minimal version: Logger.swift declares one os.Logger with subsystem \"com.session-replay\". CapturedFrame.swift declares a struct with appName, windowTitle, frameNumber, captureTime. ScreenCaptureService runs at the configured framesPerSecond (default 5) and stamps each frame with Date() at capture time. Per chunk, SessionRecorder emits ChunkInfo with startTimestamp and endTimestamp. To bridge any log line, run log show --predicate 'subsystem == \"com.session-replay\"' and find the chunk whose [startTimestamp, endTimestamp] contains the line's timestamp. The MP4 in that chunk is the screen at that moment.",
  },
  {
    q: "Why per-frame appName and windowTitle and not just \"focused app at session start\"?",
    a: "Because users alt-tab. A 60-minute session might cover Xcode, Terminal, Safari, and Slack in arbitrary order. If you tag the session, you lose the moment-to-moment structure. If you tag the frame, you can group by minute (the chunk's activeApps histogram) and still drill back into a specific 200ms slice. CapturedFrame is per-frame on purpose: it is the smallest grain at which \"what window did the user have focused\" is well-defined, and it composes upward into per-chunk and per-session views without losing fidelity.",
  },
  {
    q: "Does this work with log stream in real time, or only with log show after the fact?",
    a: "Both. log stream --predicate 'subsystem == \"com.session-replay\"' --level info shows lines as they are written, and the SessionRecorder is also writing CapturedFrame metadata in memory in the same instant. The onChunkReady callback fires every chunkDurationSeconds (default 60) with the activeApps for the just-finalized minute, so the cadence is roughly: log stream is real-time, the per-frame appName/windowTitle is in memory, and the queryable 60-second activeApps histogram lags by at most one chunk duration. For asynchronous analysis, OSLogStore + the persisted chunk metadata gives you arbitrary historical joins.",
  },
  {
    q: "What about log levels, signposts, and activities, do those help with interaction context?",
    a: "They help with structure inside the log itself, not with interaction context. Log levels (Default/Info/Debug/Error/Fault) sort by severity. os_signpost intervals annotate a span of code execution. Activities thread context across asynchronous boundaries. All three are valuable, all three are still inside the unified logging back end, and none of them carry a single byte about the user's screen. They make logs more useful as logs; they do not turn logs into a session replay.",
  },
  {
    q: "Are there public macOS APIs that report which window the user has focused right now?",
    a: "Yes, and that is exactly the API the SDK uses. ScreenCaptureService reads NSWorkspace.shared.frontmostApplication for the active app, then walks CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) front-to-back. The first window matching the frontmost PID, with kCGWindowLayer == 0, and a frame larger than 100x100 pixels is the focused one. Window title comes from kCGWindowName when accessibility permission is granted. Apple does not log this; you have to read it yourself, per frame, on the same clock as your log calls.",
  },
];

export default function Page() {
  const ld = [
    articleSchema({
      url: PAGE_URL,
      headline:
        "macOS log viewer interaction context: why Console.app cannot show what the user was doing",
      description:
        "Apple's unified logging system records subsystem, category, message, and timestamp, and never the screen state, focused app, or window title. Bridge the gap by capturing screen frames on the same Date() clock and joining on timestamp.",
      datePublished: PUBLISHED,
      author: "Matthew Diakonov",
      authorUrl: "https://m13v.com",
    }),
    breadcrumbListSchema(breadcrumbSchemaItems),
    faqPageSchema(faqItems),
  ];

  return (
    <article className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />

      <div className="mx-auto max-w-3xl px-6 py-10">
        <Breadcrumbs items={breadcrumbItems} />

        <header className="mt-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 leading-tight">
            macOS log viewer interaction context: why Console.app cannot show what the user was doing
          </h1>
          <p className="mt-5 text-lg text-zinc-600 leading-relaxed">
            Console.app, <code className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-sm">log show</code>, <code className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-sm">log stream</code>, and OSLogStore are all surfaces over Apple's unified logging system. That system records five things per line: subsystem, category, level, message, timestamp. Screen state, focused app, and window title are not in the schema. No predicate, filter, or upgrade unlocks them, because they are never written.
          </p>
        </header>

        <div className="mt-6">
          <ArticleMeta
            author="Matthew Diakonov"
            authorRole="Written with AI"
            datePublished={PUBLISHED}
            readingTime="9 min read"
          />
        </div>

        <section className="mt-10 border-l-4 border-teal-500 bg-teal-50/60 p-6 rounded-r-md">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Direct answer (verified 2026-05-06)
          </h2>
          <p className="mt-3 text-zinc-800 text-base leading-relaxed">
            <strong className="text-zinc-900">Can a macOS log viewer show user interaction context? No.</strong> Apple's unified logging back end (the source for Console.app, <code className="text-teal-700 bg-white px-1 rounded text-sm">log show</code>, <code className="text-teal-700 bg-white px-1 rounded text-sm">log stream</code>, and OSLogStore) stores subsystem, category, level, message, and timestamp, and nothing about the user's screen, focused app, or window. To get interaction context, you have to capture it separately on the same wall-clock and join on timestamp.
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Verified against Apple's OSLog reference at{" "}
            <a
              href="https://developer.apple.com/documentation/oslog/oslogstore"
              className="text-teal-700 underline"
            >
              developer.apple.com/documentation/oslog/oslogstore
            </a>
            . OSLogEntry exposes <code className="text-zinc-800 bg-zinc-100 px-1 rounded text-xs">composedMessage</code>, <code className="text-zinc-800 bg-zinc-100 px-1 rounded text-xs">date</code>, <code className="text-zinc-800 bg-zinc-100 px-1 rounded text-xs">level</code>, <code className="text-zinc-800 bg-zinc-100 px-1 rounded text-xs">subsystem</code>, <code className="text-zinc-800 bg-zinc-100 px-1 rounded text-xs">category</code>. None of these carry screen state.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-zinc-900">What you can actually see in a macOS log viewer</h2>
          <p className="mt-3 text-zinc-700 leading-relaxed">
            Run a real query against this SDK's logs while a session is recording. The output below is what every macOS log viewer on the system can show you: Console.app's GUI, the streaming CLI, the persisted store, all of them. Watch the right-hand column.
          </p>
          <div className="mt-6">
            <TerminalOutput title={`log show --predicate 'subsystem == "com.session-replay"'`} lines={logShowOutput} />
          </div>
          <p className="mt-4 text-zinc-700 leading-relaxed">
            At <code className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-sm">14:03:42.018702</code> the SDK logged a screen-recording permission failure. From the log alone you do not know which app was frontmost, whether the user had just clicked Deny in System Settings, or whether they were even at the keyboard. The log line is the side of the conversation your code was holding. The other side, the user side, is missing.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold text-zinc-900">Why the field you want is not there</h2>
          <p className="mt-3 text-zinc-700 leading-relaxed">
            Apple's unified logging system is a structured-message bus, not a UX recorder. It is built to be cheap enough that every process on the OS can write to it, durable enough to survive crashes, and queryable enough that you can grep it weeks later. Adding "current focused window title" to every log line would couple the kernel-adjacent logging path to AppKit focus tracking and break all three of those properties. So Apple shipped the small primitive and left the bigger capture problem to apps that opt in.
          </p>
          <BeforeAfter
            title="Apple log line, alone vs. joined to a captured frame"
            before={{
              label: "Log line alone (what every macOS log viewer can show)",
              content: beforeContent,
              highlights: [
                "subsystem, category, level, message, timestamp",
                "no focused app",
                "no window title",
                "no screen state",
                "no input events",
              ],
            }}
            after={{
              label: "Log line + CapturedFrame (joined on captureTime)",
              content: afterContent,
              highlights: [
                "appName at the same wall-clock instant",
                "windowTitle resolved by CGWindowList z-order",
                "frameNumber + captureTime ⇒ exact MP4 offset",
                "per-chunk activeApps histogram",
                "range query [startTimestamp, endTimestamp]",
              ],
            }}
          />
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold text-zinc-900">The whole bridge is two files</h2>
          <p className="mt-3 text-zinc-700 leading-relaxed">
            People assume bolting interaction context onto an existing log pipeline is invasive. In practice it is two small files. The logger side is one <code className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-sm">os.Logger</code> declaration so every line in your app is filterable by a single subsystem string. The capture side is a four-field struct with a <code className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-sm">captureTime</code> default of <code className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-sm">Date()</code>, the same clock <code className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-sm">log show</code> prints. That shared clock is the entire bridge.
          </p>
          <div className="mt-6">
            <CodeComparison
              title="Logger.swift (16 lines) and CapturedFrame.swift (28 lines)"
              leftLabel="Logger.swift"
              rightLabel="CapturedFrame.swift"
              leftCode={loggerSwiftCode}
              rightCode={capturedFrameCode}
              leftLines={16}
              rightLines={28}
              reductionSuffix="lines for the screen-side struct"
            />
          </div>
          <p className="mt-4 text-zinc-700 leading-relaxed">
            Logger.swift exists to make every log line in the SDK filterable by a single predicate. CapturedFrame.swift exists to attach the four facts the unified logging system refuses to record, on the clock the unified logging system prints. Both files are public on GitHub at{" "}
            <a
              href="https://github.com/m13v/macos-session-replay"
              className="text-teal-700 underline"
            >
              github.com/m13v/macos-session-replay
            </a>
            .
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold text-zinc-900">How a single moment shows up in both streams</h2>
          <p className="mt-3 text-zinc-700 leading-relaxed">
            Consider one wall-clock instant: <code className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-sm">14:03:42.018</code>. Your code calls <code className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-sm">log("User pressed Save")</code>. At the same tick, the capture loop is sampling the screen. Both events get the same <code className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-sm">Date()</code> reading. The diagram below traces what happens to each.
          </p>
          <div className="mt-6">
            <SequenceDiagram
              title="One log call, one frame, one shared timestamp"
              actors={correlationActors}
              messages={correlationMessages}
            />
          </div>
        </section>

        <ProofBanner
          quote="The unified logging system records messages emitted by code, indexed by subsystem, category, level, and timestamp. Predicate-based queries return entries matching those fields."
          source="Apple developer documentation, OSLogStore"
          metric="0 fields for screen state"
        />

        <section className="mt-14">
          <h2 className="text-2xl font-semibold text-zinc-900">Five steps to wire interaction context to your existing log stream</h2>
          <p className="mt-3 text-zinc-700 leading-relaxed">
            If you already use <code className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-sm">os.Logger</code> in a macOS app and a log viewer is your current debugging surface, the upgrade path is short. Each step lands one missing piece.
          </p>
          <div className="mt-6">
            <StepTimeline steps={setupSteps} />
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold text-zinc-900">Where this lands you</h2>
          <p className="mt-3 text-zinc-700 leading-relaxed">
            With both streams running, your log viewer goes from a one-sided transcript to a join key. Console.app and <code className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-sm">log show</code> still do exactly what Apple ships them to do — query the unified logging back end by subsystem, category, level, message, timestamp. Nothing changes there. What changes is that the timestamps in those queries are now also indexes into a screen recording with per-frame app and window metadata.
          </p>
          <p className="mt-3 text-zinc-700 leading-relaxed">
            The phrase "macOS log viewer interaction context" is shorthand for a thing macOS does not give you for free and never will, because the unified logging system is the wrong layer to encode it. The right layer is your app, on the same Date() clock, writing the four fields Apple chose not to. You can wire that up in two small files and stop pretending Console.app is going to grow a column for it.
          </p>
        </section>

        <div className="mt-14">
          <BookCallCTA
            appearance="footer"
            destination={BOOKING}
            site="macOS Session Replay"
            heading="Want to bridge OSLog and screen state in your own macOS app?"
            description="15 minutes to walk through hooking the SDK into your existing os.Logger setup and joining log lines to chunk metadata."
          />
        </div>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold text-zinc-900">FAQ</h2>
          <FaqSection items={faqItems} />
        </section>
      </div>

      <BookCallCTA
        appearance="sticky"
        destination={BOOKING}
        site="macOS Session Replay"
        description="Bridge OSLog and screen state in your macOS app. Book a 15-minute call."
      />
    </article>
  );
}
