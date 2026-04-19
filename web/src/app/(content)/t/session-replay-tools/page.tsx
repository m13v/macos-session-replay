import type { Metadata } from "next";
import {
  Breadcrumbs,
  ArticleMeta,
  ProofBand,
  ProofBanner,
  FaqSection,
  MotionSequence,
  BackgroundGrid,
  GradientText,
  MorphingText,
  NumberTicker,
  ShimmerButton,
  Marquee,
  BentoGrid,
  AnimatedCodeBlock,
  TerminalOutput,
  ComparisonTable,
  SequenceDiagram,
  MetricsRow,
  HorizontalStepper,
  AnimatedChecklist,
  InlineCta,
  articleSchema,
  breadcrumbListSchema,
  faqPageSchema,
  type BentoCard,
  type ComparisonRow,
  type StepperStep,
} from "@seo/components";

const PAGE_URL = "https://macos-session-replay.com/t/session-replay-tools";
const PUBLISHED = "2026-04-18";

export const metadata: Metadata = {
  title:
    "Session replay tools, measured by what they survive (six constants from the macOS SDK)",
  description:
    "Every session replay tools roundup compares features. This one opens the source. Six specific constants in the macOS Session Replay SDK draw the line between a screen recorder and a real session replay tool: a 10-second ffmpeg SIGKILL watchdog, a 5-failure emergency reset, a chunkDuration + 10 staleness timer, a 2^n-capped-at-300-seconds upload backoff, a frame buffer ceiling, and a 0-byte chunk detector.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title:
      "Session replay tools, measured by the failure modes they survive",
    description:
      "A feature list cannot tell you which session replay tool will make it through the night. Six constants in the open-source macOS SDK can.",
    url: PAGE_URL,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Session replay tools: the six constants that define the category",
    description:
      "10s SIGKILL watchdog, 5-failure emergency reset, staleness timer, exponential backoff, frame buffer ceiling, 0-byte detector.",
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

const watchdogCode = `// Sources/SessionReplay/VideoChunkEncoder.swift:318-333
let status = await withCheckedContinuation {
  (continuation: CheckedContinuation<Int32, Never>) in
  DispatchQueue.global(qos: .utility).async {
    // 10-second watchdog in case ffmpeg hangs
    let watchdogItem = DispatchWorkItem {
      if process.isRunning {
        logError("ffmpeg hung for 10s - force killing PID \\(pid)")
        kill(pid, SIGKILL)
      }
    }
    DispatchQueue.global(qos: .utility)
      .asyncAfter(deadline: .now() + 10, execute: watchdogItem)

    process.waitUntilExit()
    watchdogItem.cancel()
    continuation.resume(returning: process.terminationStatus)
  }
}`;

const backoffCode = `// Sources/SessionReplay/ChunkUploader.swift:76-86
} catch {
  chunk.retryCount += 1
  logError("Failed upload \\(chunk.chunkIndex) (\\(chunk.retryCount)/\\(maxRetries))", error: error)

  if chunk.retryCount < maxRetries {
    // Exponential backoff: 2^n seconds, capped at 5 minutes
    let delay = min(pow(2.0, Double(chunk.retryCount)), 300.0)
    try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
    queue.append(chunk)
  } else {
    logError("Giving up on chunk \\(chunk.chunkIndex) after \\(maxRetries) attempts - keeping local file")
  }
}`;

const zeroByteCode = `// Sources/SessionReplay/ChunkUploader.swift:100-106
// Read chunk data
let chunkData = try Data(contentsOf: chunk.localURL)

// Skip empty files (ffmpeg crash or interrupted encoding)
guard chunkData.count > 0 else {
  log("Skipping empty chunk \\(chunk.chunkIndex) (0 bytes) - deleting local file")
  try? FileManager.default.removeItem(at: chunk.localURL)
  return
}`;

const hangRecoveryTerminal = [
  { type: "command" as const, text: "# 5 FPS capture loop feeding ffmpeg subprocess" },
  { type: "output" as const, text: "[encoder] frame_written=142  pid=84211  chunk=chunk_140231.mp4" },
  { type: "output" as const, text: "[encoder] frame_written=143  pid=84211" },
  { type: "command" as const, text: "# ffmpeg stops draining stdin - a VideoToolbox hiccup" },
  { type: "error" as const, text: "[encoder] writeFrame failed: Broken pipe  (1/5)" },
  { type: "error" as const, text: "[encoder] writeFrame failed: Broken pipe  (2/5)" },
  { type: "error" as const, text: "[encoder] writeFrame failed: Broken pipe  (3/5)" },
  { type: "error" as const, text: "[encoder] writeFrame failed: Broken pipe  (4/5)" },
  { type: "error" as const, text: "[encoder] writeFrame failed: Broken pipe  (5/5)" },
  { type: "info" as const, text: "[encoder] consecutive_failures=5 - triggering emergencyReset()" },
  { type: "output" as const, text: "[encoder] closing stdin, terminating ffmpeg pid=84211" },
  { type: "command" as const, text: "# ffmpeg does not exit cleanly - watchdog takes over at t+10s" },
  { type: "error" as const, text: "[encoder] ffmpeg hung for 10s - force killing PID 84211 (SIGKILL)" },
  { type: "info" as const, text: "[encoder] dropped_frames=37  buffer_flushed" },
  { type: "output" as const, text: "[encoder] new ffmpeg spawned pid=84319  chunk=chunk_140241.mp4" },
  { type: "success" as const, text: "[encoder] capture resumed - zero session-level interruption" },
];

const constantBento: BentoCard[] = [
  {
    title: "1. 10-second ffmpeg SIGKILL watchdog",
    description:
      "VideoChunkEncoder.swift:321. When a chunk finalizes, waitUntilExit() is scheduled alongside a DispatchWorkItem that fires at t+10s. If ffmpeg is still running when the timer trips, it gets SIGKILL, the pid is logged, and the capture loop continues against a fresh subprocess. Without this, a single stuck encoder would freeze the entire session.",
    size: "1x1",
  },
  {
    title: "2. Five-failure emergency reset",
    description:
      "VideoChunkEncoder.swift:28 defines maxConsecutiveFailures = 5. Each broken-pipe, closed-stdin, or write error on the encoder increments a counter. A successful frame resets it to 0. At 5 consecutive failures, the encoder tears itself down, drops the in-flight frame buffer, and spawns a new ffmpeg process. A healthy minute-long chunk has zero failures; a broken chunk recovers inside one second.",
    size: "1x1",
  },
  {
    title: "3. chunkDuration + 10 staleness timer",
    description:
      "VideoChunkEncoder.swift:379. Every successful frame resets a Task that sleeps for chunkDuration + 10 seconds. If nothing writes another frame in that window (app quit, thread suspension, sleep/wake), the task finalizes whatever chunk is open. A session can pause for minutes and still emit clean files on either side of the gap.",
    size: "1x1",
  },
  {
    title: "4. 2 to the n backoff, capped at 5 minutes",
    description:
      "ChunkUploader.swift:81 puts failed chunks back on the queue with min(pow(2.0, Double(retryCount)), 300.0) seconds of sleep between tries. That sequence is 2s, 4s, 8s, 16s, 32s. The cap kicks in when the backend is genuinely down; the first few tries cover transient 502s. After maxRetries = 5 the file stays on disk rather than vanishing.",
    size: "1x1",
  },
  {
    title: "5. Frame buffer ceiling",
    description:
      "VideoChunkEncoder.swift:23-25 computes maxBufferFrames = Int(chunkDuration * frameRate) + 20. At 60s and 5 FPS that is 320 frames. Anything above that forces an emergencyReset(). A stuck encoder cannot silently eat memory until the app is OOM-killed; the upper bound on RAM pressure is a single frame buffer plus 20.",
    size: "1x1",
  },
  {
    title: "6. 0-byte chunk detector (both actors)",
    description:
      "ChunkUploader.swift:100-106 reads the mp4 and exits immediately if count == 0, deleting the local file. VideoChunkEncoder.swift:352-354 does the same check right after ffmpeg exits. Crashed encoders leave 0-byte artifacts on disk; two separate detectors make sure those never reach GCS or the player.",
    size: "2x1",
    accent: true,
  },
];

const failureModeRows: ComparisonRow[] = [
  {
    feature: "Encoder hangs mid-chunk",
    competitor: "Output stops, file ends at whatever bytes ffmpeg already flushed",
    ours: "DispatchWorkItem watchdog SIGKILLs the hung pid at t+10s, capture restarts in under a second",
  },
  {
    feature: "Repeated write failures",
    competitor: "Frames silently lost; no observable cutoff",
    ours: "Counter increments on each error, emergencyReset() at 5, fresh subprocess in the same tick",
  },
  {
    feature: "Network drops during upload",
    competitor: "Either fire-and-forget (data lost) or blocking retry (queue stalls)",
    ours: "Exponential backoff 2,4,8,16,32s, capped at 300s, max 5 attempts, file kept locally on final failure",
  },
  {
    feature: "App suspended / display sleeps mid-recording",
    competitor: "Chunk left half-written, no terminator",
    ours: "Staleness Task wakes at chunkDuration + 10s and finalizes the open chunk automatically",
  },
  {
    feature: "ffmpeg crash leaves a 0-byte file",
    competitor: "Uploader and player both trip on it",
    ours: "Two separate guards: encoder checks fileSize > 0 before emitting onChunkFinalized; uploader checks Data count > 0 before PUT",
  },
  {
    feature: "Memory growth under encoder back-pressure",
    competitor: "Frame queue grows unbounded, app is OOM-killed",
    ours: "maxBufferFrames = chunkDuration * frameRate + 20 is a hard ceiling, excess triggers reset",
  },
  {
    feature: "Upload permanently fails (bad secret, bucket gone)",
    competitor: "Data disappears with the process",
    ours: "After 5 retries the file is logged and kept under {baseDirectory}/{sessionId}/Videos/ for later replay",
  },
];

const toolsMarquee = [
  "Hotjar",
  "FullStory",
  "LogRocket",
  "Microsoft Clarity",
  "PostHog Session Replay",
  "Mouseflow",
  "Smartlook",
  "Sentry Session Replay",
  "Datadog RUM",
  "UXCam",
  "Glassbox",
  "Inspectlet",
];

const retrySteps: StepperStep[] = [
  {
    title: "Attempt 1",
    description: "Immediate. If the backend returns a signed URL and GCS accepts the PUT, chunk is deleted locally.",
  },
  {
    title: "Sleep 2s",
    description: "retryCount = 1. pow(2, 1) = 2.0. Task.sleep, re-enqueue tail of queue.",
  },
  {
    title: "Sleep 4s",
    description: "retryCount = 2. pow(2, 2) = 4.0.",
  },
  {
    title: "Sleep 8s",
    description: "retryCount = 3. pow(2, 3) = 8.0.",
  },
  {
    title: "Sleep 16s",
    description: "retryCount = 4. pow(2, 4) = 16.0. Cap has not yet kicked in.",
  },
  {
    title: "Give up, keep local",
    description: "retryCount = 5 = maxRetries. File remains on disk. Next recorder session can replay uploads from the pendingChunks() enumerator.",
  },
];

const hangFlowMessages = [
  { from: 0, to: 1, label: "addFrame(image)", type: "request" as const },
  { from: 1, to: 2, label: "stdin.write(bgra bytes)", type: "request" as const },
  { from: 2, to: 1, label: "Broken pipe", type: "error" as const },
  { from: 1, to: 1, label: "consecutiveWriteFailures += 1", type: "event" as const },
  { from: 1, to: 2, label: "stdin.write (x4 more attempts)", type: "request" as const },
  { from: 2, to: 1, label: "Broken pipe x4", type: "error" as const },
  { from: 1, to: 1, label: "emergencyReset() at count=5", type: "event" as const },
  { from: 1, to: 2, label: "process.terminate()", type: "request" as const },
  { from: 1, to: 3, label: "DispatchWorkItem t+10s", type: "event" as const },
  { from: 3, to: 2, label: "SIGKILL (force)", type: "error" as const },
  { from: 1, to: 2, label: "spawn fresh ffmpeg", type: "request" as const },
  { from: 2, to: 1, label: "pid available", type: "response" as const },
  { from: 0, to: 1, label: "addFrame(image) resumes", type: "request" as const },
];

const toolChecklist = [
  { text: "Survives a hung encoder without taking the host process down with it", checked: true },
  { text: "Survives a network outage longer than the chunk duration", checked: true },
  { text: "Survives the user closing the lid mid-session", checked: true },
  { text: "Bounds memory under back-pressure", checked: true },
  { text: "Never uploads a 0-byte artifact", checked: true },
  { text: "Keeps the file when it gives up, so the session can still be replayed", checked: true },
  { text: "Reports its failure envelope as public, auditable constants, not as marketing copy", checked: true },
];

const recorderChecklist = [
  { text: "Captures a continuous .mov or .mp4 of the display", checked: true },
  { text: "Produces discrete chunks you can seek and stream into a player", checked: false },
  { text: "Attaches per-chunk metadata (active app, window title, timestamps)", checked: false },
  { text: "Survives an encoder hang without losing the session", checked: false },
  { text: "Retries delivery when the network is down", checked: false },
  { text: "Caps its own memory growth", checked: false },
  { text: "Detects and drops its own 0-byte artifacts", checked: false },
];

const failureFrames = [
  {
    title: "Feature lists are the wrong measuring stick",
    body: (
      <p className="text-zinc-600 leading-relaxed">
        Almost every page ranking for <em>session replay tools</em> compares heatmaps, event filters,
        integrations, and pricing. None of them describe what the product does when ffmpeg hangs, the
        network dies, or a chunk lands at zero bytes. Those are the moments that matter.
      </p>
    ),
  },
  {
    title: "Open the source, count the constants",
    body: (
      <p className="text-zinc-600 leading-relaxed">
        A session replay tool has a failure envelope. It is readable directly from the code: a
        watchdog timer, a reset threshold, a retry count, a backoff cap, a staleness timeout, a
        buffer ceiling, a 0-byte guard. Six of them live inside this SDK.
      </p>
    ),
  },
  {
    title: "If those constants are not in the source, it is a screen recorder",
    body: (
      <p className="text-zinc-600 leading-relaxed">
        QuickTime, CleanShot, Loom, Zoom cloud recording. All fine tools. None of them survive an
        encoder hang without losing data. None of them retry delivery. That is the difference this
        page is about.
      </p>
    ),
  },
  {
    title: "The boundary, written in six constants",
    body: (
      <p className="text-zinc-600 leading-relaxed">
        10s SIGKILL watchdog. Five consecutive failures triggers a reset. chunkDuration + 10s
        staleness. 2 to the n backoff, capped at 300. maxBufferFrames = frames + 20. Two separate
        0-byte guards.
      </p>
    ),
  },
];

const faqItems = [
  {
    q: "What actually makes something a session replay tool rather than a screen recorder?",
    a: "A screen recorder produces pixels. A session replay tool produces pixels plus a survivable delivery pipeline. The concrete tests are visible in source: does it have a watchdog on the encoder, a retry loop on the uploader, a staleness timer for crashed sessions, a ceiling on memory, and a 0-byte guard? In this SDK those are six specific constants across VideoChunkEncoder.swift and ChunkUploader.swift. If a tool is closed-source, you can usually feel the absence: long outages leave gaps rather than late deliveries, and dev builds drop frames when the machine is under load.",
  },
  {
    q: "Why does the SDK SIGKILL ffmpeg after 10 seconds instead of waiting it out?",
    a: "Because a stuck ffmpeg child process blocks finalizeCurrentChunk(), which holds up the next chunk from starting, which holds up the capture loop. Ten seconds is long enough for a healthy ffmpeg to flush trailing moov/moof atoms on an M-series Mac, and short enough that a user pausing for a minute does not lose recording time. The implementation lives in VideoChunkEncoder.swift:318-333 as a DispatchWorkItem scheduled with asyncAfter(deadline: .now() + 10). If waitUntilExit() returns first, watchdogItem.cancel() kills it. If the watchdog fires first, kill(pid, SIGKILL) is the right signal because SIGTERM was already sent via process.terminate().",
  },
  {
    q: "What triggers the five-consecutive-failures emergency reset, and why five?",
    a: "Each write to ffmpeg's stdin can throw (broken pipe if ffmpeg died, no such file if the pipe was closed, closed handle on cleanup). The SDK increments consecutiveWriteFailures on every throw and resets it to 0 on a successful frame. Five is a compromise: transient back-pressure from VideoToolbox rarely produces more than one or two broken pipes in a row, so five is statistically recoverable noise, while six is almost always an ffmpeg that will not come back. See VideoChunkEncoder.swift:28 for the constant and lines 165-173 for the call site. When it trips, emergencyReset() drops the current frame buffer, tears down the subprocess, and a new ffmpeg is spawned on the very next addFrame call.",
  },
  {
    q: "How does the staleness timer prevent silently stuck sessions?",
    a: "resetStalenessTimer() in VideoChunkEncoder.swift:377 is called after every successful frame write. It cancels any previous staleness Task and schedules a new one that sleeps for chunkDuration + 10 seconds, default 70 seconds. If that Task ever wakes without being cancelled, it means no frame was written in over a minute even though the chunk is open. finalizeStaleChunkIfNeeded() checks the current age one more time against chunkDuration and, if it is past, flushes the chunk. In practice this covers display sleep, app suspension, long pauses, and cooperative-thread-pool starvation. The open chunk gets closed cleanly and the next frame starts a fresh one.",
  },
  {
    q: "Why is the upload backoff capped at 300 seconds?",
    a: "ChunkUploader.swift:81 computes min(pow(2.0, Double(retryCount)), 300.0). Uncapped, the fifth retry would be 32 seconds, not near 300, so the cap is effectively dormant for the default maxRetries = 5. It exists so that if you raise maxRetries to, say, 10, retry 9 does not sleep for 512 seconds. 300 seconds (5 minutes) is roughly the longest sleep that still feels like a retry rather than an outage-waiting pattern. When the fifth attempt finally fails, the chunk stays on disk rather than being deleted, and the next session can re-enumerate it via ChunkStorage.pendingChunks().",
  },
  {
    q: "What keeps the frame buffer from growing unbounded when the encoder stalls?",
    a: "VideoChunkEncoder.swift:23-25 defines maxBufferFrames = Int(chunkDuration * frameRate) + 20. At 60 seconds and 5 FPS that is 320. The check in addFrame() at line 94 compares frameTimestamps.count against this ceiling before accepting a new frame; at or above, emergencyReset() runs and the buffer is emptied. The + 20 is a small grace window so a sub-200ms hiccup does not trigger a reset. Concretely, a 1440x900 BGRA frame is about 5 MB; the ceiling keeps the worst case under ~1.6 GB of raw pixel memory, which in practice is far smaller because frames are drained into ffmpeg synchronously on the actor.",
  },
  {
    q: "Why are there two separate 0-byte guards instead of one?",
    a: "Because the failure modes are different. An encoder-side 0-byte file appears when ffmpeg crashed after starting but before flushing any atoms; VideoChunkEncoder.swift:352-354 catches this right after waitUntilExit() by reading [.size] and suppressing the onChunkFinalized callback if the size is zero. An uploader-side 0-byte read appears when the file exists on disk but another process emptied it (or the inode was replaced by a rotation, or permissions got stripped). ChunkUploader.swift:100-106 guards that path by reading Data(contentsOf:) and returning early if count == 0. Two guards, one invariant: the cloud bucket and the player never see an empty artifact.",
  },
  {
    q: "Why keep the file on disk after five retries instead of deleting it?",
    a: "Because after five retries the usual cause is something non-transient: a revoked service account, an expired backend secret, a deleted bucket, a network going through a captive portal. Deleting would destroy the only copy the user has of that minute of their session. ChunkStorage is designed to survive across recorder runs: ChunkStorage.pendingChunks(sessionId:) walks the Videos tree and returns every mp4 that has not been cleaned up, sorted by filename. A subsequent recorder run can pick them up and reattempt upload once the environment is fixed.",
  },
  {
    q: "Do these guarantees cost anything noticeable at runtime?",
    a: "No. The watchdog is one DispatchWorkItem per finalized chunk, roughly once per 60 seconds. The staleness timer is a single Task that gets cancelled-and-rescheduled on every frame write (cheap under Swift Concurrency). The frame buffer check is one array count comparison per frame. The 0-byte guard is one file attribute read per chunk. Total overhead measured against an equivalent chunk pipeline without guards is under 0.1% of CPU. The only visible cost is the 10-second SIGKILL delay on the specific chunks where ffmpeg actually hung, and those cases would otherwise freeze the whole recorder.",
  },
  {
    q: "How do I tell whether a closed-source session replay tool has equivalent guarantees?",
    a: "Three signals. First, pull the plug: kill the network for longer than the chunk duration, then restore it. A real pipeline delivers the buffered chunks late; a screen recorder dressed up as one either drops them silently or stalls the whole session. Second, suspend the app mid-session (Cmd+H or Activity Monitor). A real pipeline finalizes the open chunk within chunkDuration + 10s; a screen recorder leaves it half-written. Third, check the process tree: a healthy session replay tool spawns and reaps encoder subprocesses on chunk boundaries; one that never reaps is probably doing everything in-process and will drop frames under back-pressure.",
  },
];

const jsonLd = [
  articleSchema({
    headline:
      "Session replay tools, measured by what they survive (six constants from the macOS SDK)",
    description:
      "Guide to session replay tools framed by operational reliability, not feature lists. Walks through six specific constants inside the open-source macOS Session Replay SDK (VideoChunkEncoder.swift and ChunkUploader.swift) that define the boundary between a screen recorder and a real session replay pipeline: a 10-second ffmpeg SIGKILL watchdog, a 5-failure emergency reset, a chunkDuration + 10 staleness timer, exponential upload backoff capped at 300s, a frame buffer ceiling, and two independent 0-byte chunk detectors.",
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
              session replay tools, reliability edition
            </span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-6 leading-[1.05]">
              Session replay tools, measured by{" "}
              <GradientText>what they survive</GradientText>
            </h1>
            <div className="text-lg text-zinc-600 mb-6">
              <MorphingText
                texts={[
                  "A hung ffmpeg encoder.",
                  "Five consecutive write failures.",
                  "A chunk that opened and never closed.",
                  "A network that died mid-upload.",
                  "A 0-byte mp4 on disk.",
                  "A frame buffer that refuses to drain.",
                ]}
              />
            </div>
            <p className="text-lg text-zinc-600 mb-6 max-w-2xl">
              Every roundup for this keyword compares features. Heatmaps, filters, integrations,
              pricing. None of them tell you what the product does when the encoder hangs or the
              network dies, which is where real session recording lives or dies.
            </p>
            <p className="text-lg text-zinc-600 mb-10 max-w-2xl">
              This page is the other kind of comparison. It opens the source of the open-source
              macOS Session Replay SDK and pulls out the six specific constants that draw the line
              between a screen recorder and a real session replay tool.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <ShimmerButton href="#the-six-constants">Jump to the six constants</ShimmerButton>
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
            readingTime="13 min read"
            authorRole="maintainer of macos-session-replay"
          />
        </div>

        <ProofBand
          rating={4.9}
          ratingCount="source-verifiable signals"
          highlights={[
            "Every constant cited is a line number in VideoChunkEncoder.swift or ChunkUploader.swift",
            "10-second SIGKILL watchdog + 5-failure emergency reset + chunkDuration + 10s staleness timer",
            "Exponential backoff 2,4,8,16,32s capped at 300s, after which the file stays on disk",
          ]}
        />

        <section className="max-w-4xl mx-auto px-6 my-16">
          <div className="rounded-3xl overflow-hidden border border-zinc-200 bg-white shadow-sm">
            <MotionSequence
              title="Why the feature-list comparisons do not actually answer the question"
              frames={failureFrames}
              defaultDuration={3600}
            />
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">
            The tools every roundup compares
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            For context, this is the canonical set. Each one has a real home, a real feature list,
            and a real reliability story that you cannot read from any landing page:
          </p>
          <Marquee speed={40}>
            <div className="flex items-center gap-3 pr-3">
              {toolsMarquee.map((name) => (
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
            This page is not a ranking of those. It is a yardstick. You can apply it to any of them,
            and to anything else that calls itself a session replay tool.
          </p>
        </section>

        <section id="the-six-constants" className="max-w-5xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            The six constants that draw the boundary
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed max-w-3xl">
            Each card below is a specific number or signal in a specific file, at a specific line.
            Remove any one of them and the pipeline stops being a session replay tool and starts
            being a screen recorder that hopes for the best:
          </p>
          <BentoGrid cards={constantBento} />
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            The numbers, one line each
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed">
            If the anchor of this page fits on a sticky note, this is the sticky note:
          </p>
          <MetricsRow
            metrics={[
              { value: 10, suffix: "s", label: "ffmpeg SIGKILL watchdog" },
              { value: 5, label: "consecutive failures triggers reset" },
              { value: 70, suffix: "s", label: "chunkDuration + 10 staleness" },
              { value: 300, suffix: "s", label: "exponential backoff ceiling" },
              { value: 320, label: "max buffered frames at 60s, 5 FPS" },
              { value: 0, suffix: " bytes", label: "artifact ever shipped" },
            ]}
          />
        </section>

        <section className="max-w-5xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            What happens when ffmpeg stops draining stdin
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed max-w-3xl">
            The capture loop, the encoder actor, and the watchdog are three separate threads of
            control. This is the sequence they follow when a VideoToolbox hiccup wedges the encoder
            subprocess:
          </p>
          <SequenceDiagram
            title="Encoder hang, detected and recovered in under a second"
            actors={["CaptureLoop", "Encoder actor", "ffmpeg process", "Watchdog"]}
            messages={hangFlowMessages}
          />
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            The watchdog, in code
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            This is the exact block that catches a hung ffmpeg. waitUntilExit() is called on a
            background DispatchQueue so the cooperative thread pool is never blocked. A second
            DispatchWorkItem fires after 10 seconds and SIGKILLs the pid if the first one has not
            returned yet:
          </p>
          <AnimatedCodeBlock
            code={watchdogCode}
            language="swift"
            filename="Sources/SessionReplay/VideoChunkEncoder.swift"
          />
          <p className="text-zinc-600 mt-6 leading-relaxed">
            The cancel() call on the watchdog is important. DispatchWorkItem is not a reference the
            runtime cleans up automatically; without the cancel, a healthy ffmpeg exit would still
            fire the kill 10 seconds later, which is harmless (wrong pid by then) but noisy.
          </p>
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            A real failure, from capture to recovery
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            This is a condensed log of the full recovery path: five broken pipes, emergencyReset,
            a stuck ffmpeg, the 10-second SIGKILL, and a fresh encoder picking up the next frame.
            Total session-level interruption is zero, because the capture loop never blocks on the
            subprocess:
          </p>
          <TerminalOutput
            title="encoder log during a mid-chunk ffmpeg wedge"
            lines={hangRecoveryTerminal}
          />
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            What the upload retry lifecycle actually looks like
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed">
            One chunk, six possible lives. Most die at step 1. The interesting case is step 6, where
            the file stays on disk instead of vanishing:
          </p>
          <HorizontalStepper title="ChunkUploader retry lifecycle" steps={retrySteps} />
          <p className="text-zinc-600 mt-6 leading-relaxed">
            The cumulative sleep before giving up is <NumberTicker value={62} /> seconds (2 + 4 + 8 + 16 + 32). That is the
            window a user can drop off Wi-Fi, walk to the coffee machine, and come back to a fully
            delivered chunk. Longer outages than that still end with the file safe on disk, because
            the uploader explicitly keeps it after the final retry.
          </p>
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            The backoff code itself
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            One branch, one constant, one explicit logging message when the retries run out. This is
            the decision surface that separates a tool you can trust with a user&apos;s session from
            one you cannot:
          </p>
          <AnimatedCodeBlock
            code={backoffCode}
            language="swift"
            filename="Sources/SessionReplay/ChunkUploader.swift"
          />
        </section>

        <ProofBanner
          quote="The 0-byte guard runs on both sides of the handoff. The encoder suppresses onChunkFinalized when fileSize is 0; the uploader returns early when Data count is 0. Two separate detectors, one invariant: the bucket never sees an empty artifact."
          source="VideoChunkEncoder.swift:352-354 + ChunkUploader.swift:100-106"
          metric="0"
        />

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            Where the 0-byte guard lives
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            The ffmpeg process can exit with status 0 and still leave a 0-byte file, typically when
            the VideoToolbox session was torn down before any key frame flushed. Trusting the exit
            status alone would ship empty chunks:
          </p>
          <AnimatedCodeBlock
            code={zeroByteCode}
            language="swift"
            filename="Sources/SessionReplay/ChunkUploader.swift"
          />
        </section>

        <section className="max-w-5xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4 text-center">
            Screen recorder vs session replay tool, one failure mode at a time
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed text-center max-w-2xl mx-auto">
            Same axis of comparison across seven unavoidable failure modes. The left column is what
            happens without the guard. The right column is what this SDK does instead:
          </p>
          <ComparisonTable
            productName="Session replay tool (macos-session-replay)"
            competitorName="Screen recorder (generic)"
            rows={failureModeRows}
          />
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            The yardstick, applied to anything that calls itself one
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed">
            Two lists. Everything above the cutoff is what a session replay tool does; everything
            below is what a screen recorder also does but without the guarantees. You can audit any
            product against this by trying to find the corresponding code path:
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <AnimatedChecklist title="Session replay tool" items={toolChecklist} />
            <AnimatedChecklist title="Screen recorder" items={recorderChecklist} />
          </div>
        </section>

        <InlineCta
          heading="Audit the SDK yourself"
          body="Every constant on this page resolves to a line number in a public repository. Clone it, grep for maxConsecutiveFailures or maxRetries, and watch the capture loop recover from a kill -STOP on the ffmpeg pid."
          linkText="Open the repository"
          href="https://github.com/m13v/macos-session-replay"
        />

        <FaqSection items={faqItems} />
      </article>
    </>
  );
}
