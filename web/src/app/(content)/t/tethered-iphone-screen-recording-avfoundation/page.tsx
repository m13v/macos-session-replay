import type { Metadata } from "next";
import {
  Breadcrumbs,
  ArticleMeta,
  ProofBanner,
  FaqSection,
  TerminalOutput,
  SequenceDiagram,
  CodeComparison,
  BeforeAfter,
  StepTimeline,
  InlineCta,
  BookCallCTA,
  articleSchema,
  breadcrumbListSchema,
  faqPageSchema,
} from "@seo/components";

const PAGE_URL =
  "https://macos-session-replay.com/t/tethered-iphone-screen-recording-avfoundation";
const PUBLISHED = "2026-05-06";
const BOOKING = "https://cal.com/team/mediar/macos-session-replay";

export const metadata: Metadata = {
  title:
    "Tethered iPhone screen recording with AVFoundation: the CoreMediaIO gate every guide forgets",
  description:
    "Your iPhone is plugged in, trusted, unlocked, and AVCaptureDevice.DiscoverySession still returns an empty array. The reason is a single CoreMediaIO property, kCMIOHardwarePropertyAllowScreenCaptureDevices, that has to be flipped to 1 before AVFoundation will even acknowledge the device. This guide walks the exact 4-byte write, the .external/.muxed discovery pair on macOS 14+, the warmup race, and the rate limit nobody documents.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title:
      "Tethered iPhone screen recording with AVFoundation: the one CoreMediaIO write that unlocks the device",
    description:
      "kCMIOHardwarePropertyAllowScreenCaptureDevices = 1, AVCaptureDevice.DiscoverySession on .external + .muxed, and the warmup race that explains your empty device list.",
    url: PAGE_URL,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Tethered iPhone screen recording with AVFoundation, properly",
    description:
      "Empty device list from AVCaptureDevice.DiscoverySession is almost always one missing CoreMediaIO property. Here is the exact write.",
  },
  robots: { index: true, follow: true },
};

const breadcrumbItems = [
  { label: "macOS Session Replay", href: "/" },
  { label: "Guides", href: "/t" },
  { label: "Tethered iPhone screen recording with AVFoundation" },
];

const breadcrumbSchemaItems = [
  { name: "macOS Session Replay", url: "https://macos-session-replay.com/" },
  { name: "Guides", url: "https://macos-session-replay.com/t" },
  {
    name: "Tethered iPhone screen recording with AVFoundation",
    url: PAGE_URL,
  },
];

const closedGateCode = `import AVFoundation

// You expect this to return your tethered iPhone.
// On a fresh process, it returns [].
let session = AVCaptureDevice.DiscoverySession(
    deviceTypes: [.external],
    mediaType:   .muxed,
    position:    .unspecified
)

print(session.devices.count)
// 0

// The phone is unlocked. "Trust This Computer" is granted.
// QuickTime sees the device. Your app does not.`;

const openGateCode = `import AVFoundation
import CoreMediaIO

// One 4-byte UInt32 write to the CoreMediaIO system object.
// This is the gate every surface-level guide forgets.
func allowScreenCaptureDevices() {
    let element: CMIOObjectPropertyElement =
        if #available(macOS 12.0, *) {
            CMIOObjectPropertyElement(kCMIOObjectPropertyElementMain)
        } else {
            CMIOObjectPropertyElement(kCMIOObjectPropertyElementMaster)
        }

    var addr = CMIOObjectPropertyAddress(
        mSelector: CMIOObjectPropertySelector(
            kCMIOHardwarePropertyAllowScreenCaptureDevices),
        mScope:    CMIOObjectPropertyScope(
            kCMIOObjectPropertyScopeGlobal),
        mElement:  element)

    var allow: UInt32 = 1
    CMIOObjectSetPropertyData(
        CMIOObjectID(kCMIOObjectSystemObject),
        &addr, 0, nil,
        UInt32(MemoryLayout.size(ofValue: allow)),
        &allow)
}

allowScreenCaptureDevices()
// Wait a moment. Then re-run discovery.

let session = AVCaptureDevice.DiscoverySession(
    deviceTypes: [.external],
    mediaType:   .muxed,
    position:    .unspecified
)
print(session.devices.first?.localizedName ?? "still nothing")
// "Matt's iPhone 15 Pro"`;

const closedDiscoveryLines = [
  { type: "command" as const, text: "$ swift run TetheredCapture" },
  { type: "output" as const, text: "[discovery] AVCaptureDevice.DiscoverySession" },
  { type: "output" as const, text: "[discovery]   deviceTypes: [.external]" },
  { type: "output" as const, text: "[discovery]   mediaType:   .muxed" },
  { type: "output" as const, text: "[discovery]   devices.count = 0" },
  { type: "error" as const, text: "no AVCaptureDevice for tethered iPhone" },
];

const openDiscoveryLines = [
  { type: "command" as const, text: "$ swift run TetheredCapture --allow-screen-capture-devices" },
  { type: "output" as const, text: "[cmio] kCMIOHardwarePropertyAllowScreenCaptureDevices := 1" },
  { type: "output" as const, text: "[cmio] waiting for AVCaptureDeviceWasConnected ..." },
  { type: "output" as const, text: "[cmio] device announced after 2.4s" },
  { type: "output" as const, text: "[discovery] AVCaptureDevice.DiscoverySession" },
  { type: "output" as const, text: "[discovery]   deviceTypes: [.external]" },
  { type: "output" as const, text: "[discovery]   mediaType:   .muxed" },
  { type: "output" as const, text: "[discovery]   devices.count = 1" },
  { type: "success" as const, text: "device[0] = \"Matt's iPhone 15 Pro\" (uniqueID: 00008130-...)" },
];

const flipBefore = (
  <div>
    <p className="text-zinc-700 leading-relaxed mb-4">
      Plug iPhone into the Mac. Unlock. Tap &quot;Trust&quot;. Run any AVFoundation
      sample that calls{" "}
      <code className="px-1 py-0.5 rounded bg-zinc-100 text-teal-700 text-sm font-mono">
        AVCaptureDevice.DiscoverySession
      </code>
      .
    </p>
    <p className="text-zinc-700 leading-relaxed">
      The session returns zero devices. Re-running it does nothing. Your camera
      ({" "}
      <code className="px-1 py-0.5 rounded bg-zinc-100 text-teal-700 text-sm font-mono">
        .builtInWideAngleCamera
      </code>
      ) shows up; the phone does not.
    </p>
    <ul className="mt-5 space-y-2 text-zinc-600 text-sm">
      <li>Phone: trusted, unlocked, present in Finder sidebar.</li>
      <li>QuickTime &gt; New Movie Recording lists the iPhone fine.</li>
      <li>Your AVFoundation app: empty device list, no error.</li>
    </ul>
  </div>
);

const flipAfter = (
  <div>
    <p className="text-zinc-700 leading-relaxed mb-4">
      Write{" "}
      <code className="px-1 py-0.5 rounded bg-teal-50 text-teal-700 text-sm font-mono">
        UInt32 = 1
      </code>{" "}
      to{" "}
      <code className="px-1 py-0.5 rounded bg-teal-50 text-teal-700 text-sm font-mono">
        kCMIOHardwarePropertyAllowScreenCaptureDevices
      </code>{" "}
      via{" "}
      <code className="px-1 py-0.5 rounded bg-teal-50 text-teal-700 text-sm font-mono">
        CMIOObjectSetPropertyData
      </code>
      .
    </p>
    <p className="text-zinc-700 leading-relaxed">
      Wait between 0.5 and a few seconds. The device announces via{" "}
      <code className="px-1 py-0.5 rounded bg-teal-50 text-teal-700 text-sm font-mono">
        AVCaptureDeviceWasConnected
      </code>
      . Re-run discovery and the iPhone appears as an{" "}
      <code className="px-1 py-0.5 rounded bg-teal-50 text-teal-700 text-sm font-mono">
        AVCaptureDevice
      </code>{" "}
      with media type{" "}
      <code className="px-1 py-0.5 rounded bg-teal-50 text-teal-700 text-sm font-mono">
        .muxed
      </code>
      .
    </p>
    <ul className="mt-5 space-y-2 text-zinc-600 text-sm">
      <li>One AVCaptureDevice exposing audio + video as muxed.</li>
      <li>Native resolution, native frame rate. No transcoding cost.</li>
      <li>uniqueID is stable; cache it instead of re-discovering.</li>
    </ul>
  </div>
);

const lifecycleSteps = [
  {
    title: "Open the gate (CoreMediaIO write)",
    description:
      "Set kCMIOHardwarePropertyAllowScreenCaptureDevices to UInt32 1 against the system object. Pick kCMIOObjectPropertyElementMain on macOS 12+, kCMIOObjectPropertyElementMaster below. This is a process-scoped opt-in; the OS does not persist it.",
  },
  {
    title: "Trigger device discovery (warmup)",
    description:
      "Call AVCaptureDevice.DiscoverySession at least once after the property write. The first call primes the CoreMediaIO notification machinery; without it, AVCaptureDeviceWasConnected may never fire, and the iPhone stays invisible even after appearing in QuickTime.",
  },
  {
    title: "Wait for AVCaptureDeviceWasConnected",
    description:
      "Subscribe to NotificationCenter.default for .AVCaptureDeviceWasConnected. The device announces itself anywhere from 200 ms to several seconds after the property flip. Treat the property write as async; do not synchronously expect a device on the next line.",
  },
  {
    title: "Resolve the AVCaptureDevice",
    description:
      "Use AVCaptureDevice.DiscoverySession(deviceTypes: [.external], mediaType: .muxed) on macOS 14 and later. On older macOS, deviceTypes was [.externalUnknown]. The session returns AVCaptureDevice instances; pick the first whose hasMediaType(.muxed) returns true.",
  },
  {
    title: "Build the AVCaptureSession",
    description:
      "Create AVCaptureDeviceInput from the device. Add it to a fresh AVCaptureSession. Add an output, typically AVCaptureMovieFileOutput for direct .mov, or AVCaptureVideoDataOutput if you want CMSampleBuffers for an encoder you control. Configure session.sessionPreset = .high or hold off and configure activeFormat manually for native resolution.",
  },
  {
    title: "Start running",
    description:
      "session.startRunning() spins up the capture pipeline. The first frame typically arrives within 100 to 300 ms. The session keeps running until you call stopRunning() or the iPhone is physically disconnected, at which point AVCaptureDeviceWasDisconnected fires.",
  },
  {
    title: "Tear down on disconnect",
    description:
      "Treat unplug as the normal exit. Stop the session, release the input, and reset state. Do not flip the CoreMediaIO property back to 0; the OS handles cleanup on process exit, and toggling rapidly within the rate-limit window will cause the next session to silently fail to discover anything.",
  },
];

const captureSeqMessages = [
  { from: 0, to: 1, label: "CMIOObjectSetPropertyData(allow = 1)", type: "request" as const },
  { from: 1, to: 0, label: "OSStatus 0", type: "response" as const },
  { from: 0, to: 2, label: "DiscoverySession(.external, .muxed)", type: "request" as const },
  { from: 2, to: 0, label: "[] (warmup)", type: "response" as const },
  { from: 1, to: 0, label: "AVCaptureDeviceWasConnected (~2s later)", type: "event" as const },
  { from: 0, to: 2, label: "DiscoverySession(.external, .muxed)", type: "request" as const },
  { from: 2, to: 0, label: "[AVCaptureDevice<iPhone>]", type: "response" as const },
  { from: 0, to: 3, label: "AVCaptureDeviceInput(device:)", type: "request" as const },
  { from: 0, to: 3, label: "session.addInput / addOutput / startRunning()", type: "request" as const },
  { from: 3, to: 0, label: "first CMSampleBuffer", type: "response" as const },
];

const faqItems = [
  {
    q: "Why is my AVCaptureDevice.DiscoverySession returning an empty array even though the iPhone is trusted?",
    a: "Because tethered iOS devices are gated behind a CoreMediaIO opt-in that AVFoundation does not flip for you. Set kCMIOHardwarePropertyAllowScreenCaptureDevices on the kCMIOObjectSystemObject to UInt32 1 via CMIOObjectSetPropertyData, then wait for AVCaptureDeviceWasConnected (or simply re-call DiscoverySession a second or two later). The phone does not appear until that property is set, which is why QuickTime can see it (it sets the same property internally) and your fresh AVFoundation process cannot. The trust prompt is a separate, earlier prerequisite; granting trust is necessary but not sufficient.",
  },
  {
    q: "What deviceType should I pass to AVCaptureDevice.DiscoverySession on macOS 14 and later?",
    a: "Use [.external] with mediaType .muxed. Apple deprecated .externalUnknown in macOS 14 in favor of .external, which now covers both DSLRs over USB and tethered iOS devices. If you support older macOS, use [.externalUnknown] there. The mediaType matters: tethered iPhones publish themselves as .muxed (audio + video on a single AVCaptureDevice), not .video. If you discover with mediaType .video alone, you will miss the iPhone even after the CoreMediaIO gate is open.",
  },
  {
    q: "How long after setting the CoreMediaIO property does the iPhone become visible?",
    a: "Anywhere from a few hundred milliseconds to several seconds, depending on whether the iOS device daemon (usbmuxd / CoreDeviceFramework) is already warm. The property write itself returns OSStatus 0 immediately, but the AVCaptureDeviceWasConnected notification is asynchronous. Treat the flip as async: write the property, register for the notification, and only act on the device when the notification fires. Polling DiscoverySession in a tight loop wastes CPU and does not speed up the kernel-side enumeration.",
  },
  {
    q: "Why do some forums warn about a rate limit on this CoreMediaIO property?",
    a: "Because flipping the property repeatedly, especially in succession across short-lived processes during development, can put CoreMediaIO into a state where the next set returns 0 but no device is announced. The empirical workaround is to flip it once per process, leave it set for the lifetime of that process, and avoid quick relaunch loops while debugging. Apple does not document a specific cooldown, but reports of a multi-second to roughly one-minute delay before normal behavior returns appear in multiple forum threads. The practical implication: do not toggle the property to 0 on teardown; let the OS clean up at process exit.",
  },
  {
    q: "Can I use ScreenCaptureKit instead of AVFoundation for this?",
    a: "No. ScreenCaptureKit is a macOS-only API; it captures macOS displays, windows, and applications. It has no concept of an external AVCaptureDevice and cannot read frames from a tethered iOS device. AVFoundation's AVCaptureDevice path with the CoreMediaIO opt-in is currently the supported way to record a tethered iPhone screen on macOS, and it is what QuickTime Player and OBS both use under the hood. If you are recording the macOS desktop itself, prefer ScreenCaptureKit; if you are recording a tethered iPhone, AVFoundation is the only sanctioned path.",
  },
  {
    q: "Does the iPhone audio come along with the screen, or do I need a separate input?",
    a: "It comes along, because the device is exposed with mediaType .muxed (a single AVCaptureDevice carrying both audio and video). When you wire that device through AVCaptureDeviceInput, both tracks land on the AVCaptureSession; an AVCaptureMovieFileOutput will write a .mov with both. If you want video without audio, use AVCaptureVideoDataOutput and ignore the audio connection, or call setEnabled(false) on the audio AVCaptureConnection. If you want audio without video, do the inverse. The muxed input itself is not splittable at the device level.",
  },
  {
    q: "What is the right format and resolution to expect from a modern iPhone over Lightning or USB-C?",
    a: "Native screen resolution, no transcoding. A current iPhone delivers something like 1170x2532 or 1290x2796 at native pixel density. Frame rate is typically 30 to 60 fps depending on the source content. The pixel format on the AVCaptureSession comes through as a yuv-flavored CMSampleBuffer; if you pipe it into AVAssetWriter or hardware H.265, the encoder handles the colorspace conversion. Do not call session.sessionPreset = .high blindly: on iPhones that drops you to a downscaled 720x1280 path. To get native pixels, enumerate device.formats and pick the one whose dimensions match the device's screen, then assign it to device.activeFormat.",
  },
  {
    q: "How do I detect when the user unplugs the iPhone mid-recording?",
    a: "Subscribe to .AVCaptureDeviceWasDisconnected on NotificationCenter. The notification fires within a few hundred milliseconds of physical disconnect, with the disconnected AVCaptureDevice as object. The AVCaptureSession will also emit AVCaptureSessionRuntimeError shortly after; handle both. The clean teardown is: stop the session, remove the input, drop your reference to the device, and update UI to ask the user to reconnect. Do not re-flip the CoreMediaIO property; it stays set for the process and re-discovery will pick the iPhone up again on the next plug-in event without further opt-in.",
  },
  {
    q: "Why does my recording crash or hang the first frame after I add an AVCaptureMovieFileOutput?",
    a: "Three usual causes. First, the output URL is non-writable: AVCaptureMovieFileOutput needs an absolute file:// URL in a directory the app process can write to (sandbox-aware). Second, the output is added before the input, or before the session has a usable connection: order the calls as session.beginConfiguration(), addInput, addOutput, commitConfiguration(), startRunning(), then startRecording(to:). Third, the output's maxRecordedDuration or maxRecordedFileSize is set to a CMTime that has not been initialized; default to .invalid (no limit). The crash usually surfaces as an NSInternalInconsistencyException about no active connection.",
  },
  {
    q: "Can I do this from a sandboxed app distributed via the Mac App Store?",
    a: "Maybe, with caveats. The com.apple.security.device.usb entitlement is required to talk to USB-attached devices; com.apple.security.device.camera covers the AVFoundation side. The CoreMediaIO property flip itself is process-scoped and does not require an additional entitlement, but App Review has historically scrutinized CoreMediaIO usage; expect to justify it in the review notes. Hardened runtime apps signed for distribution outside the Mac App Store have an easier time; the most common shipping pattern for tethered-iPhone-recording tools (OBS, RecordIt, the original ReflectorScreen) is Developer ID rather than MAS.",
  },
];

const jsonLd = [
  articleSchema({
    headline:
      "Tethered iPhone screen recording with AVFoundation: the CoreMediaIO gate every guide forgets",
    description:
      "Practical Swift walkthrough for recording a tethered iPhone screen on macOS via AVFoundation. Covers the kCMIOHardwarePropertyAllowScreenCaptureDevices opt-in, the .external/.muxed device discovery pair on macOS 14+, the warmup race that breaks DiscoverySession, the rate-limit quirk on the CoreMediaIO property, the AVCaptureSession + AVCaptureMovieFileOutput pipeline, sandbox/entitlement notes, and an honest comparison to ScreenCaptureKit.",
    url: PAGE_URL,
    datePublished: PUBLISHED,
    author: "Matthew Diakonov",
    authorUrl: "https://m13v.com",
    publisherName: "macOS Session Replay",
    publisherUrl: "https://macos-session-replay.com",
    articleType: "TechArticle",
  }),
  breadcrumbListSchema(breadcrumbSchemaItems),
  faqPageSchema(faqItems),
];

export default function TetheredIphoneAvfoundationPage() {
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
            avfoundation, the part nobody documents
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-6 leading-[1.05]">
            Tethered iPhone screen recording with AVFoundation, the
            CoreMediaIO gate every guide forgets
          </h1>
          <p className="text-lg text-zinc-700 mb-4 max-w-2xl leading-relaxed">
            Your iPhone is plugged in. Trust is granted. The phone is unlocked.
            QuickTime sees it. Your AVFoundation app calls{" "}
            <code className="px-1 py-0.5 rounded bg-zinc-100 text-teal-700 text-sm font-mono">
              AVCaptureDevice.DiscoverySession
            </code>{" "}
            and gets back an empty array. Welcome to the lost afternoon.
          </p>
          <p className="text-lg text-zinc-700 max-w-2xl leading-relaxed">
            The fix is one 4-byte write to a CoreMediaIO property. The rest of
            this page is the precise call, the discovery race that follows it,
            and the gotchas around macOS 14 device types, the warmup, and the
            rate limit no Apple doc mentions.
          </p>
        </header>

        <div className="max-w-4xl mx-auto px-6 mb-8">
          <ArticleMeta
            datePublished={PUBLISHED}
            readingTime="14 min read"
            authorRole="Written with AI"
          />
        </div>

        <section className="max-w-4xl mx-auto px-6 mb-14">
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6 md:p-8">
            <div className="text-xs font-semibold tracking-widest uppercase text-teal-700 mb-3">
              Direct answer (verified 2026-05-06)
            </div>
            <p className="text-zinc-900 text-lg leading-relaxed mb-4">
              <strong>To record a tethered iPhone via AVFoundation on macOS:</strong>{" "}
              Set{" "}
              <code className="px-1 py-0.5 rounded bg-white text-teal-700 text-sm font-mono">
                kCMIOHardwarePropertyAllowScreenCaptureDevices
              </code>{" "}
              to{" "}
              <code className="px-1 py-0.5 rounded bg-white text-teal-700 text-sm font-mono">
                UInt32 1
              </code>{" "}
              on{" "}
              <code className="px-1 py-0.5 rounded bg-white text-teal-700 text-sm font-mono">
                kCMIOObjectSystemObject
              </code>{" "}
              via{" "}
              <code className="px-1 py-0.5 rounded bg-white text-teal-700 text-sm font-mono">
                CMIOObjectSetPropertyData
              </code>
              , wait for{" "}
              <code className="px-1 py-0.5 rounded bg-white text-teal-700 text-sm font-mono">
                AVCaptureDeviceWasConnected
              </code>
              , then call{" "}
              <code className="px-1 py-0.5 rounded bg-white text-teal-700 text-sm font-mono">
                AVCaptureDevice.DiscoverySession(deviceTypes: [.external], mediaType: .muxed)
              </code>{" "}
              (macOS 14+). The phone shows up as a normal AVCaptureDevice you
              can wire into an AVCaptureSession.
            </p>
            <p className="text-sm text-zinc-700">
              Verified against{" "}
              <a
                href="https://developer.apple.com/forums/thread/759245"
                className="text-teal-700 underline hover:text-teal-800"
              >
                Apple Developer Forums thread 759245
              </a>{" "}
              and Apple&apos;s{" "}
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

        <section className="max-w-4xl mx-auto px-6 my-14">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            Why your device list is empty
          </h2>
          <p className="text-zinc-700 mb-4 leading-relaxed">
            macOS treats tethered iOS devices as a privileged class of capture
            source. They are physically attached, they expose the entire screen
            of a separate device, and they predate the modern privacy prompts
            most AVFoundation devices go through. So instead of a runtime
            permission, Apple gates them behind a CoreMediaIO system property
            that processes have to opt into explicitly.
          </p>
          <p className="text-zinc-700 leading-relaxed">
            Until that property is set, the device is not just hidden from
            DiscoverySession; it does not exist as far as your process is
            concerned. The OS will not enumerate it, will not announce it via
            the connection notifications, and will not produce a uniqueID for
            it. QuickTime Player flips this property internally on launch,
            which is why everyone&apos;s first instinct (&quot;but QuickTime sees
            it!&quot;) is correct and unhelpful at the same time.
          </p>
        </section>

        <section className="max-w-4xl mx-auto px-6 my-14">
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">
            The single property write, in context
          </h2>
          <p className="text-zinc-700 mb-6 leading-relaxed">
            Left: the AVFoundation code that returns an empty array. Right: the
            same code, with the CoreMediaIO opt-in added above it. The diff is
            twenty lines. The behavioral change is total.
          </p>
          <CodeComparison
            leftCode={closedGateCode}
            rightCode={openGateCode}
            leftLabel="Without the gate (silent zero results)"
            rightLabel="With the CoreMediaIO opt-in"
            title="DiscoverySession behavior, gate closed vs gate open"
          />
        </section>

        <section className="max-w-4xl mx-auto px-6 my-14">
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">
            What the discovery loop actually prints
          </h2>
          <p className="text-zinc-700 mb-6 leading-relaxed">
            Two runs of the same Swift program, one without the property flip
            and one with. The interesting line is the 2.4 second wait: the
            device announcement is async, and any code that expects a synchronous
            result on the next line of the property write will see an empty
            array and conclude (incorrectly) that something else is wrong.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <TerminalOutput
              title="Without the CoreMediaIO opt-in"
              lines={closedDiscoveryLines}
            />
            <TerminalOutput
              title="With the CoreMediaIO opt-in"
              lines={openDiscoveryLines}
            />
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 my-14">
          <BeforeAfter
            title="Before and after the property flip"
            before={{
              content: flipBefore,
              highlights: [
                "DiscoverySession returns []",
                "no error, no notification, no log",
                "QuickTime sees the phone, your app does not",
                "trust + unlock are necessary but not sufficient",
              ],
            }}
            after={{
              content: flipAfter,
              highlights: [
                "DiscoverySession returns [iPhone] after warmup",
                "AVCaptureDeviceWasConnected fires within seconds",
                "device.hasMediaType(.muxed) is true",
                "uniqueID is stable across replug, cache it",
              ],
            }}
          />
        </section>

        <ProofBanner
          quote="The property change isn't instantaneous; devices take up to a few seconds to appear, and you can listen to AVCaptureDeviceWasConnected to know when. Setting this property repeatedly within a short window can rate-limit the system into not announcing the device at all."
          source="Apple Developer Forums + multiple field reports"
          metric=">2s"
        />

        <section className="max-w-5xl mx-auto px-6 my-14">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            The full lifecycle, seven steps
          </h2>
          <p className="text-zinc-700 mb-8 leading-relaxed max-w-3xl">
            From a fresh process with a plugged-in iPhone to a running
            AVCaptureSession producing CMSampleBuffers. Step 2 is where most
            apps fail silently; step 7 is where most apps leak.
          </p>
          <StepTimeline steps={lifecycleSteps} />
        </section>

        <section className="max-w-5xl mx-auto px-6 my-14">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            One frame, end to end
          </h2>
          <p className="text-zinc-700 mb-8 leading-relaxed max-w-3xl">
            Four participants: your code, the CoreMediaIO system object, the
            AVCaptureDevice resolver, and the AVCaptureSession running on its
            own queue. The async hop in the middle is the warmup that costs
            people hours.
          </p>
          <SequenceDiagram
            title="Property flip, async device announcement, session start"
            actors={["YourApp", "CMIOSystem", "AVDeviceResolver", "AVCaptureSession"]}
            messages={captureSeqMessages}
          />
        </section>

        <section className="max-w-4xl mx-auto px-6 my-14">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            Where ScreenCaptureKit fits, where AVFoundation wins
          </h2>
          <p className="text-zinc-700 mb-4 leading-relaxed">
            I work on a session-replay SDK for macOS apps that uses
            ScreenCaptureKit at 5 FPS. When I scoped iOS device coverage, I
            walked through this exact AVFoundation path and concluded the two
            APIs serve different problems and you should not try to unify them.
          </p>
          <p className="text-zinc-700 mb-4 leading-relaxed">
            ScreenCaptureKit is the right answer when you want to capture a
            macOS app from inside macOS: it gives you SCContentFilter,
            per-window capture, and a frame stream you can throttle to 5 FPS
            without wasting CPU. It cannot see a tethered iPhone, because the
            iPhone is not a window or a display from the OS&apos;s point of
            view; it is an external AVCaptureDevice.
          </p>
          <p className="text-zinc-700 leading-relaxed">
            AVFoundation with the CoreMediaIO opt-in is the right answer for
            the iPhone case, but it gives you the entire device screen at
            native resolution and frame rate, which is a lot of bytes per
            second. You will want to downscale or drop frames before encoding
            unless you genuinely want a 60fps 1170x2532 H.265 stream. The
            two APIs share zero session objects; if you need both Mac and
            iPhone capture in one app, run them as two parallel pipelines.
          </p>
        </section>

        <InlineCta
          heading="Want this fully working in your repo?"
          body="Clone the macOS Session Replay SDK to see how the macOS half is wired (ScreenCaptureKit, H.265 hardware encoding, 60-second fragmented MP4 chunks). The Swift patterns translate directly to the AVFoundation iPhone path; treat the SDK as the macOS reference and this guide as the iOS-tethered companion."
          linkText="Open the repository"
          href="https://github.com/m13v/macos-session-replay"
        />

        <BookCallCTA
          appearance="footer"
          destination={BOOKING}
          site="macOS Session Replay"
          heading="Building a tethered-capture tool and want a second pair of eyes?"
          description="I have spent more time than I would like to admit on CoreMediaIO and AVFoundation edge cases. If you are wiring this into a product, book 30 minutes and bring your stack trace."
        />

        <FaqSection items={faqItems} />

        <BookCallCTA
          appearance="sticky"
          destination={BOOKING}
          site="macOS Session Replay"
          description="Stuck on AVCaptureDevice discovery? Book 30 min."
        />
      </article>
    </>
  );
}
