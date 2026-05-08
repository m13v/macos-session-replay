import type { Metadata } from "next";
import {
  Breadcrumbs,
  ArticleMeta,
  FaqSection,
  BentoGrid,
  IntegrationsGrid,
  MetricsRow,
  AnimatedBeam,
  AnimatedSection,
  RelatedPostsGrid,
  InlineCta,
  BookCallCTA,
  GradientText,
  articleSchema,
  breadcrumbListSchema,
  faqPageSchema,
} from "@seo/components";

const PAGE_URL = "https://github.com/m13v/macos-session-replay";
const PUBLISHED = "2026-05-08";
const BOOKING = "https://cal.com/team/mediar/macos-session-replay";

export const metadata: Metadata = {
  title:
    "iPhone screen recording Mac app: which one to pick, and what is actually under the hood",
  description:
    "Every Mac app that records an iPhone screen, from QuickTime to Screen Studio to OBS to a custom Swift build, wraps the same two Apple frameworks. The choice between them is editorial, not technical. Here is a developer's read on which app fits which job, written by someone who has built one of these recorders.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title:
      "iPhone screen recording Mac app: a developer's read on QuickTime, Screen Studio, OBS, and rolling your own",
    description:
      "All of them flip the same CoreMediaIO bit. The difference is what they layer on top: device frames, audio capture, file format, mid-recording resilience.",
    url: PAGE_URL,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "iPhone screen recording Mac app: same Apple plumbing, different wrappers",
    description:
      "QuickTime, Screen Studio, Matte, SmoothCapture, OBS, custom AVFoundation. Picked apart by a developer who has shipped one.",
  },
  robots: { index: true, follow: true },
};

const breadcrumbItems = [
  { label: "macOS Session Replay", href: "/" },
  { label: "Guides", href: "/t/session-replay-tools" },
  { label: "iPhone screen recording Mac app" },
];

const breadcrumbSchemaItems = [
  {
    name: "macOS Session Replay",
    url: "https://github.com/m13v/macos-session-replay",
  },
  {
    name: "Guides",
    url: "https://github.com/m13v/macos-session-replay",
  },
  { name: "iPhone screen recording Mac app", url: PAGE_URL },
];

const bentoCards = [
  {
    title: "Built-in: QuickTime Player",
    description:
      "Free, ships on every Mac, supports tethered iPhone over USB. Click File > New Movie Recording, then the chevron next to the red button, then pick the iPhone as both Camera and Microphone. The audio chevron is the step every guide skips.",
    size: "1x1" as const,
    accent: true,
  },
  {
    title: "Polished demos: Screen Studio, Matte, SmoothCapture",
    description:
      "Paid Mac apps that wrap the same AVFoundation device pickup, then add real-time device frames, hover effects, automatic zoom on click, and fixed-aspect export. The recording engine is identical to QuickTime; the value is in the post layer.",
    size: "1x1" as const,
  },
  {
    title: "Streaming: OBS Studio with the iOS DAL plugin",
    description:
      "Free, open-source, supports the iPhone as a video source via OBS's iOS plugin. Same CoreMediaIO path under the hood. Use this when the recording is part of a longer composite, screen plus webcam plus iPhone, or when you need RTMP out.",
    size: "1x1" as const,
  },
  {
    title: "Programmatic: AVFoundation in your own Swift app",
    description:
      "Drop AVFoundation into a Swift Package and you control every byte: codec, fragmentation, chunk size, where files land, when to upload. This is the path you take when you want session-replay style always-on capture rather than a one-off file.",
    size: "2x1" as const,
  },
  {
    title: "Cross-device: capture iPhone and Mac in one timeline",
    description:
      "QuickTime cannot do this in a single file. The iPhone half goes through AVFoundation; the Mac half goes through ScreenCaptureKit. They are different frameworks, different sessions, different output buffers. Either run two recordings and reconcile by clock, or use a wrapper that synchronizes them at capture time.",
    size: "1x1" as const,
  },
];

const apps = [
  {
    name: "QuickTime Player",
    description: "Built-in. Free. Tethered iPhone, .mov out.",
    initial: "Q",
  },
  {
    name: "Screen Studio",
    description: "Paid. Demo-grade post effects, device frames.",
    initial: "S",
  },
  {
    name: "Matte",
    description: "Paid. iOS Simulator + real device, frame-aware export.",
    initial: "M",
  },
  {
    name: "SmoothCapture",
    description: "Paid. 3D device mockups baked into the recording.",
    initial: "Sc",
  },
  {
    name: "OBS Studio",
    description: "Free. iOS DAL plugin, multi-source composites, RTMP out.",
    initial: "O",
  },
  {
    name: "ScreenFlow",
    description: "Paid. Long-form editing on top of the same device feed.",
    initial: "Sf",
  },
  {
    name: "Camo",
    description: "Paid. iPhone as a webcam first, recorder second.",
    initial: "C",
  },
  {
    name: "macOS Session Replay (Swift package)",
    description: "Drop into your own app, ScreenCaptureKit + AVFoundation.",
    initial: "SR",
  },
];

const faqItems = [
  {
    q: "What is the simplest Mac app to record my iPhone screen?",
    a: "QuickTime Player. It is already on your Mac. Plug the iPhone in with a data-capable USB cable, unlock the phone, tap Trust This Computer, then in QuickTime click File > New Movie Recording. Click the small chevron next to the red record button. Set Camera to your iPhone. Then set Microphone to your iPhone too, this is the step the Apple help page glosses over and the reason most QuickTime recordings come out silent. Hit record. Stop with Cmd+Ctrl+Esc to avoid hunting for the QuickTime window. The file is a self-contained .mov in your Movies folder.",
  },
  {
    q: "Why do free QuickTime recordings look worse than paid app recordings of the same iPhone?",
    a: "They do not, at the pixel level. Both apps tap the same AVFoundation device feed, which is the iPhone's framebuffer at native resolution and a variable frame rate that mirrors the display. What you are seeing in the paid apps is post-processing: a 3D device frame around the recording, automatic zoom on tap, smoothed cursor, background gradient, fixed-aspect export. None of that comes from the iPhone, all of it is rendered on the Mac after the frames arrive. If you only need the raw recording, QuickTime is bit-for-bit the same source.",
  },
  {
    q: "Can I record my iPhone screen without a cable, using only a Mac app?",
    a: "Sort of, with caveats. Wireless options either rely on AirPlay mirroring to the Mac (Reflector, AirServer, LonelyScreen) and then capturing the Mac's screen, or on a developer-mode Wi-Fi pairing introduced in iOS 17. Both add latency, both compress the stream, both occasionally drop a frame on Wi-Fi congestion. For QA, demos, or anything where frame timing matters, USB tethered is what you want. The cable is the boring answer that just works. For unattended capture across a fleet of devices, this is one of the cases where rolling your own AVFoundation pipeline is faster than fighting AirPlay.",
  },
  {
    q: "Why does my iPhone not appear as an input in OBS or my custom Swift app, but works in QuickTime?",
    a: "Because QuickTime quietly flips a CoreMediaIO property when it launches that other apps have to flip themselves. The property is kCMIOHardwarePropertyAllowScreenCaptureDevices, a 4-byte UInt32. Your app sets it to 1 against the CoreMediaIO system object, and only after that write does AVCaptureDevice.DiscoverySession on deviceType .external with mediaType .muxed return the tethered iPhone. The longer guide on this site walks the exact write, including the macOS 12 element-main constant change. OBS handles this internally via its iOS DAL plugin; Camo, Matte, Screen Studio, and SmoothCapture do it in their app launch path.",
  },
  {
    q: "What file size and frame rate should I expect from a Mac app recording an iPhone?",
    a: "From QuickTime at Maximum quality on an iPhone 15 Pro, expect roughly 60 to 90 MB per minute, an .mov container with HEVC video and AAC audio if you set Microphone, and a variable frame rate that tracks the iPhone display, typically 30 to 60 frames per second. Paid apps compressing to a fixed-aspect demo export usually land around 8 to 20 MB per minute. A custom Swift recorder using H.265 hardware encoding at 5 frames per second, the rate macOS Session Replay uses for analytics-grade capture, sits at roughly 6 to 12 MB per minute at 1440p, which is the file-size profile you want when you are storing every session of every user.",
  },
  {
    q: "Which Mac app should I pick for App Store screen recordings or marketing demos?",
    a: "Screen Studio, Matte, or SmoothCapture, in roughly that order of market share. The reason is the post layer, not the recording. App Store and marketing demos benefit from a real device frame around the iPhone screen, smooth cursor or tap indicators, automatic zoom on interaction, and a clean fixed-aspect export. Building those on top of QuickTime requires Final Cut or DaVinci. The paid apps collapse the workflow into one tool. The recording itself is the same source you would get from QuickTime; you are paying for the editor.",
  },
  {
    q: "Which Mac app should I pick for QA bug reports?",
    a: "QuickTime, almost always. The bug ticket needs a self-contained .mov dropped onto a Linear or Jira card within ten minutes of repro, with audio narration so the engineer can hear what you are doing. QuickTime gives you exactly that and nothing else, which is the right amount for QA. The longer QA-specific guide on this site covers the audio chevron, file size math against tracker upload limits, the cable-wiggle disconnect, and what goes in the ticket alongside the .mov.",
  },
  {
    q: "Which Mac app should I pick for unattended or always-on capture?",
    a: "None of the off-the-shelf ones. QuickTime, Screen Studio, OBS, and Matte all assume a human is present to start, narrate, and stop the recording. Always-on capture, the kind you want when you are trying to understand how users actually use your app over a session of work, needs the recording to start automatically, chunk into independent files so a crash or unplug does not destroy the whole session, and upload in the background. That is what session replay SDKs do; for native macOS apps, that is what we built. The iPhone-side equivalent uses AVFoundation directly with the same chunking discipline, which the AVFoundation companion guide walks through.",
  },
  {
    q: "Can a Mac app record both my iPhone and my Mac at the same time, in one file?",
    a: "Not with QuickTime, and not with any of the consumer-grade demo apps in a single timeline. Tethered iPhone capture goes through AVFoundation with the .muxed media type. Mac screen capture goes through ScreenCaptureKit, which is a different framework with its own session, sample buffers, and entitlements. The two practical options are: record both as separate files with the system clock visible in each and reconcile by timestamp in review, or use a tool that wraps both APIs and synchronizes at capture time. macOS Session Replay does the macOS half; pairing it with an AVFoundation pipeline gives you the cross-device version.",
  },
  {
    q: "Do I need a paid Apple Developer account to use any of these apps?",
    a: "No, not as a user. QuickTime, OBS, Screen Studio, and Matte all run on a regular Mac without any developer setup. As a developer building your own recorder, you need code signing for distribution. The binary needs com.apple.security.device.usb to talk to the tethered iPhone and com.apple.security.device.camera to use AVCaptureDevice. Developer ID signing and notarization are enough for internal or direct distribution. Mac App Store distribution gets reviewed; Apple has historically asked for justification when a non-camera app talks to CoreMediaIO. None of this matters if you are just trying to record your iPhone screen for a bug report.",
  },
];

const relatedPosts = [
  {
    title:
      "iPhone tethered QA screen recording: the audio chevron, the file size math, the bug-attach checklist",
    href: "/t/iphone-tethered-qa-screen-recording",
    excerpt:
      "The QA-specific addendum to the QuickTime path. Audio narration, file size against Linear and Jira limits, race-condition timing, the cable-wiggle disconnect, and what goes in the ticket.",
    tag: "QA",
  },
  {
    title:
      "Tethered iPhone screen recording with AVFoundation: the CoreMediaIO gate every guide forgets",
    href: "/t/tethered-iphone-screen-recording-avfoundation",
    excerpt:
      "When you are writing your own recorder, this is the 4-byte UInt32 write that makes AVCaptureDevice.DiscoverySession actually return the iPhone. The exact code, the warmup race, and the rate limit.",
    tag: "AVFoundation",
  },
  {
    title: "What is user behavior analytics for native apps",
    href: "/t/what-is-user-behavior-analytics",
    excerpt:
      "One-off bug recordings are useful but not enough. This is the case for always-on session replay on the desktop, and where the iPhone half fits.",
    tag: "Analytics",
  },
];

const jsonLd = [
  articleSchema({
    headline:
      "iPhone screen recording Mac app: which one to pick, and what is actually under the hood",
    description:
      "Every Mac app that records an iPhone screen wraps the same two Apple frameworks. A developer's read on QuickTime, Screen Studio, Matte, SmoothCapture, OBS, and rolling your own, including the CoreMediaIO gate every recorder must flip and how to pick the right tool for your job.",
    url: PAGE_URL,
    datePublished: PUBLISHED,
    author: "Matthew Diakonov",
    authorUrl: "https://m13v.com",
    publisherName: "macOS Session Replay",
    publisherUrl: "https://github.com/m13v/macos-session-replay",
    articleType: "TechArticle",
  }),
  breadcrumbListSchema(breadcrumbSchemaItems),
  faqPageSchema(faqItems),
];

export default function IphoneScreenRecordingMacAppPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="min-h-screen pb-24">
        <div className="max-w-4xl mx-auto px-6 pt-10">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <header className="max-w-4xl mx-auto px-6 pt-8 pb-4">
          <span className="inline-block bg-teal-50 text-teal-700 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6">
            Mac apps for iPhone screen recording
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-6 leading-[1.05]">
            iPhone screen recording on a Mac:{" "}
            <GradientText>same Apple plumbing</GradientText>, different
            wrappers
          </h1>
          <p className="text-lg text-zinc-700 mb-4 max-w-2xl leading-relaxed">
            QuickTime, Screen Studio, Matte, SmoothCapture, OBS, ScreenFlow,
            Camo. The list of Mac apps that can record an iPhone screen is
            long, the listicles ranking them are longer. What none of those
            articles tell you is that every single one of them wraps the same
            pair of Apple frameworks.
          </p>
          <p className="text-lg text-zinc-700 max-w-2xl leading-relaxed">
            The choice between them is not a recording-quality question. It is
            a question of what each app layers on top of the same source: a
            device frame, an audio chevron, a chunked file format, a real-time
            mockup, a session replay pipeline. This page is the mechanism
            view. I have built one of these recorders, and the parts that
            matter are not the parts the marketing pages compare.
          </p>
        </header>

        <div className="max-w-4xl mx-auto px-6 mb-8">
          <ArticleMeta
            datePublished={PUBLISHED}
            readingTime="9 min read"
            authorRole="Written with AI"
          />
        </div>

        <section className="max-w-4xl mx-auto px-6 mb-14">
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6 md:p-8">
            <div className="text-xs font-semibold tracking-widest uppercase text-teal-700 mb-3">
              Direct answer (verified 2026-05-08)
            </div>
            <p className="text-zinc-900 text-lg leading-relaxed mb-3">
              <strong>
                The Mac app to record an iPhone screen is QuickTime Player,
              </strong>{" "}
              already installed on every Mac. Plug the iPhone in with a
              data-capable cable, unlock and tap Trust This Computer, then{" "}
              <code className="px-1 py-0.5 rounded bg-white text-teal-700 text-sm font-mono">
                File &gt; New Movie Recording
              </code>
              , click the small chevron next to the red record button, set
              both <strong>Camera and Microphone</strong> to the iPhone, hit
              record. The output is a self-contained{" "}
              <code className="px-1 py-0.5 rounded bg-white text-teal-700 text-sm font-mono">
                .mov
              </code>
              .
            </p>
            <p className="text-zinc-900 text-base leading-relaxed mb-4">
              For polished marketing or App Store demos with device frames and
              automatic zoom on tap, pick Screen Studio, Matte, or
              SmoothCapture. For streaming or multi-source composites, OBS
              Studio with its iOS plugin. For unattended, always-on, or
              programmatic capture, AVFoundation directly inside your own
              Swift app.
            </p>
            <p className="text-sm text-zinc-700">
              Verified against Apple&apos;s{" "}
              <a
                href="https://support.apple.com/en-us/102618"
                className="text-teal-700 underline hover:text-teal-800"
              >
                Mac screen recording guide
              </a>{" "}
              and the{" "}
              <a
                href="https://developer.apple.com/documentation/avfoundation/avcapturedevice"
                className="text-teal-700 underline hover:text-teal-800"
              >
                AVCaptureDevice documentation
              </a>
              .
            </p>
          </div>
        </section>

        <AnimatedSection>
          <section className="max-w-4xl mx-auto px-6 mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-4">
              The mechanism every Mac app shares
            </h2>
            <p className="text-zinc-700 mb-4 leading-relaxed">
              Recording a tethered iPhone on a Mac is one Apple framework
              talking to another, with one OS-level switch in between. That
              switch is the part that decides whether the iPhone shows up at
              all.
            </p>
            <p className="text-zinc-700 mb-4 leading-relaxed">
              The framework on the receiving end is{" "}
              <strong>AVFoundation</strong>, specifically{" "}
              <code className="px-1 py-0.5 rounded bg-zinc-100 text-zinc-800 text-sm font-mono">
                AVCaptureDevice.DiscoverySession
              </code>{" "}
              with{" "}
              <code className="px-1 py-0.5 rounded bg-zinc-100 text-zinc-800 text-sm font-mono">
                deviceType: [.external]
              </code>{" "}
              and{" "}
              <code className="px-1 py-0.5 rounded bg-zinc-100 text-zinc-800 text-sm font-mono">
                mediaType: .muxed
              </code>{" "}
              on macOS 14 and later. The iPhone exposes itself to the Mac as a
              single muxed device, meaning audio and video share one source.
              That is why QuickTime asks you to set both Camera and Microphone
              to the iPhone.
            </p>
            <p className="text-zinc-700 mb-4 leading-relaxed">
              The OS-level switch lives in{" "}
              <strong>CoreMediaIO</strong>. It is a single property called{" "}
              <code className="px-1 py-0.5 rounded bg-zinc-100 text-zinc-800 text-sm font-mono">
                kCMIOHardwarePropertyAllowScreenCaptureDevices
              </code>
              , a 4-byte{" "}
              <code className="px-1 py-0.5 rounded bg-zinc-100 text-zinc-800 text-sm font-mono">
                UInt32
              </code>{" "}
              that the recording app writes to{" "}
              <code className="px-1 py-0.5 rounded bg-zinc-100 text-zinc-800 text-sm font-mono">
                1
              </code>{" "}
              against the CoreMediaIO system object. Until that write happens,
              your AVFoundation discovery session returns an empty array even
              if the phone is plugged in, trusted, and showing up in QuickTime
              at the same time.
            </p>
            <p className="text-zinc-700 leading-relaxed">
              QuickTime sets that property internally on launch. Every other
              Mac app, paid or free, has to set it inside its own process.
              That is the reason your iPhone appears in QuickTime but not in
              your custom Swift recorder, and the reason a freshly installed
              OBS needs the iOS DAL plugin to do the same thing under the
              hood. If you want the full code, including the macOS 12{" "}
              <code className="px-1 py-0.5 rounded bg-zinc-100 text-zinc-800 text-sm font-mono">
                kCMIOObjectPropertyElementMain
              </code>{" "}
              change and the warmup race, the AVFoundation deep dive in the
              related-guides block at the end of this page walks through it
              with real code.
            </p>
          </section>
        </AnimatedSection>

        <section className="max-w-4xl mx-auto px-6 mb-14">
          <AnimatedBeam
            title="What every Mac app does to your iPhone"
            from={[
              { label: "iPhone (USB)" },
              { label: "Trust prompt" },
              { label: "CoreMediaIO write" },
            ]}
            hub={{ label: "AVCaptureDevice .muxed" }}
            to={[
              { label: ".mov / .mp4" },
              { label: "Live preview" },
              { label: "Encoder pipeline" },
            ]}
          />
          <p className="text-sm text-zinc-500 leading-relaxed">
            The pipeline is the same regardless of which Mac app you launch.
            The iPhone is a single muxed AVCaptureDevice; QuickTime, Screen
            Studio, OBS, and a custom Swift app all attach to it the same way.
            What changes downstream is the encoder, the chunking, the
            decoration, and where the file lands.
          </p>
        </section>

        <AnimatedSection>
          <section className="max-w-4xl mx-auto px-6 mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-4">
              Five jobs, five different right answers
            </h2>
            <p className="text-zinc-700 mb-4 leading-relaxed">
              The honest framing for picking a Mac app to record your iPhone
              is not best-to-worst. It is what you are using the recording
              for. The bento below maps the five common jobs onto the
              category of app that fits each one. The recording engine is the
              same in all five; what differs is the layer above it.
            </p>
            <BentoGrid cards={bentoCards} />
          </section>
        </AnimatedSection>

        <AnimatedSection>
          <section className="max-w-4xl mx-auto px-6 mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-4">
              File size and frame rate, by recorder
            </h2>
            <p className="text-zinc-700 mb-6 leading-relaxed">
              These are the rough envelopes you should expect from each
              category, recording an iPhone 15 Pro for one minute. The numbers
              are rounded for the kind of math you do at a Linear or Jira
              attach screen.
            </p>
            <MetricsRow
              metrics={[
                {
                  value: 75,
                  suffix: " MB/min",
                  label: "QuickTime, Maximum quality, .mov + HEVC",
                },
                {
                  value: 14,
                  suffix: " MB/min",
                  label: "Demo apps after fixed-aspect export",
                },
                {
                  value: 9,
                  suffix: " MB/min",
                  label: "Custom AVFoundation, 5 fps, H.265, 1440p",
                },
                {
                  value: 60,
                  suffix: " fps",
                  label: "QuickTime, variable, mirrors iPhone display",
                },
              ]}
            />
            <p className="text-sm text-zinc-500 leading-relaxed">
              The 75 MB/min QuickTime number is the reason a 10-minute repro
              session blows past Jira&apos;s 100 MB upload limit. Drop the
              file into Handbrake with a Fast 1080p30 preset before you
              attach, or move to a recorder that chunks output into 60-second
              fragments so each piece stays under the cap. The 5 fps number
              is the rate macOS Session Replay uses when capture is the
              continuous, always-on kind rather than the one-bug kind.
            </p>
          </section>
        </AnimatedSection>

        <AnimatedSection>
          <section className="max-w-4xl mx-auto px-6 mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-4">
              The Mac apps that can record an iPhone, and the layer each one
              adds
            </h2>
            <p className="text-zinc-700 mb-2 leading-relaxed">
              All eight of these tap the same AVFoundation feed. The
              second-line description is the layer on top, which is the only
              part you are choosing between.
            </p>
            <IntegrationsGrid items={apps} columns={4} />
          </section>
        </AnimatedSection>

        <AnimatedSection>
          <section className="max-w-4xl mx-auto px-6 mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-4">
              When the off-the-shelf answer breaks down
            </h2>
            <p className="text-zinc-700 mb-4 leading-relaxed">
              QuickTime is the right answer for almost every one-off. It is
              not the right answer for three specific shapes of work. If your
              job looks like one of these, the Mac App Store list is not
              going to give you what you need.
            </p>
            <p className="text-zinc-700 mb-4 leading-relaxed">
              <strong>Always-on capture across many users.</strong>{" "}
              QuickTime, Screen Studio, OBS, and Matte all assume a human is
              present to start, narrate, and stop the recording. If you are
              trying to understand how users actually use your app over a
              session of work, you need recordings that start automatically,
              chunk into independent files so a crash or unplug does not
              destroy the whole session, and upload in the background. That
              is the session-replay shape. We built it for native macOS apps;
              the iPhone-side version uses the same AVFoundation framework
              with the same chunking discipline.
            </p>
            <p className="text-zinc-700 mb-4 leading-relaxed">
              <strong>Cross-device timelines.</strong> QuickTime cannot record
              the iPhone and the Mac at the same time in one file. Tethered
              iPhone capture is AVFoundation; Mac screen capture is
              ScreenCaptureKit. Different framework, different session,
              different output. The two practical paths are running both
              recordings independently and reconciling by clock, or wrapping
              both APIs in a single tool that synchronizes at capture time.
            </p>
            <p className="text-zinc-700 leading-relaxed">
              <strong>Race-condition repros.</strong> Variable frame rate is
              fine for a marketing demo and a problem for a bug whose answer
              is which view appeared first. QuickTime gives you what the
              iPhone display gave it, which on a thermal-throttled phone can
              be 24 frames per second. For sub-frame timing, pair the screen
              recording with a synchronized log capture (Console.app on the
              Mac, or libimobiledevice&apos;s{" "}
              <code className="px-1 py-0.5 rounded bg-zinc-100 text-zinc-800 text-sm font-mono">
                idevicesyslog
              </code>
              ) and reconcile by wall clock. Treat the recording as the
              visible witness, not the only witness.
            </p>
          </section>
        </AnimatedSection>

        <AnimatedSection>
          <section className="max-w-4xl mx-auto px-6 mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-4">
              How to tell when an app&apos;s pitch is mechanism vs marketing
            </h2>
            <p className="text-zinc-700 mb-4 leading-relaxed">
              Three claims that show up on Mac iPhone-recorder landing pages
              are worth knowing how to read.
            </p>
            <p className="text-zinc-700 mb-4 leading-relaxed">
              <strong>&quot;Records the iPhone in 4K&quot;</strong> usually
              means the app captures at the iPhone&apos;s native resolution,
              which is the only resolution AVFoundation hands you. Every
              other app does the same. Native iPhone 15 Pro is 1170x2532;
              there is no extra resolution to unlock.
            </p>
            <p className="text-zinc-700 mb-4 leading-relaxed">
              <strong>&quot;60 fps recording&quot;</strong> is what you get
              from QuickTime if the iPhone display is running at 60 Hz at
              that moment. It is not a property of the recorder. iPhones with
              ProMotion run up to 120 Hz; thermal-throttled phones drop into
              the 30s. The recording rate is whatever the source rate is.
            </p>
            <p className="text-zinc-700 leading-relaxed">
              <strong>&quot;No driver install&quot;</strong> means the app
              uses the built-in CoreMediaIO path with{" "}
              <code className="px-1 py-0.5 rounded bg-zinc-100 text-zinc-800 text-sm font-mono">
                kCMIOHardwarePropertyAllowScreenCaptureDevices
              </code>{" "}
              the same way QuickTime does. This is genuinely useful when the
              alternative would be a kernel extension; it is also true for
              every reasonable recorder shipping today, so it is more of a
              floor than a feature.
            </p>
          </section>
        </AnimatedSection>

        <section className="max-w-4xl mx-auto px-6 mb-14">
          <InlineCta
            heading="Building the recorder side, not the using side?"
            body="If you are shipping a native macOS app and want session-replay style capture for your own users instead of a one-off bug video, the Swift package version of this is on GitHub. Drop it in, ScreenCaptureKit at 5 FPS with H.265 hardware encoding, local first or GCS upload. Read the AVFoundation companion guide for the iPhone half."
            linkText="See macOS Session Replay on GitHub"
            href="https://github.com/m13v/macos-session-replay"
          />
        </section>

        <section className="max-w-4xl mx-auto px-6 mb-14">
          <FaqSection items={faqItems} />
        </section>

        <section className="max-w-4xl mx-auto px-6 mb-14">
          <RelatedPostsGrid
            title="Related guides"
            subtitle="Adjacent topics on this site"
            posts={relatedPosts}
          />
        </section>

        <section className="max-w-4xl mx-auto px-6 mb-12">
          <BookCallCTA
            appearance="footer"
            destination={BOOKING}
            site="macOS Session Replay"
            heading="Building a Mac app and want session replay for your users?"
            description="Twenty minutes with the team behind the macOS Session Replay SDK. We will look at your app, your capture needs, and whether dropping in the Swift package is the right move."
          />
        </section>

        <BookCallCTA
          appearance="sticky"
          destination={BOOKING}
          site="macOS Session Replay"
          description="Native macOS app with real users? Talk to the team."
        />
      </article>
    </>
  );
}
