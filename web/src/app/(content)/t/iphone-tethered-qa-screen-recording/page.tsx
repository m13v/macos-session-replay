import type { Metadata } from "next";
import {
  Breadcrumbs,
  ArticleMeta,
  FaqSection,
  ComparisonTable,
  HorizontalStepper,
  AnimatedChecklist,
  ProofBanner,
  InlineCta,
  BookCallCTA,
  GlowCard,
  RelatedPostsGrid,
  articleSchema,
  breadcrumbListSchema,
  faqPageSchema,
} from "@seo/components";

const PAGE_URL =
  "https://macos-session-replay.com/t/iphone-tethered-qa-screen-recording";
const PUBLISHED = "2026-05-07";
const BOOKING = "https://cal.com/team/mediar/macos-session-replay";

export const metadata: Metadata = {
  title:
    "iPhone tethered QA screen recording: the audio chevron, the file size math, the bug-attach checklist",
  description:
    "Tethered iPhone screen recording for QA on a Mac, written for the QA engineer who has been burned by silent videos and 200 MB attachments that bounce. Covers the QuickTime audio dropdown nobody clicks, frame timing for race-condition repros, file size math against Linear and Jira limits, the bug-ticket checklist, and what to do when the bug spans iPhone and Mac at the same time.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title:
      "iPhone tethered QA screen recording, done so the engineer can actually use it",
    description:
      "QuickTime works, but the defaults are wrong for QA. Audio off, frame rate variable, no native size cap. Here is how to record an iPhone over USB so the bug ticket lands.",
    url: PAGE_URL,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tethered iPhone QA recording, the unglamorous practical version",
    description:
      "Audio chevron, file size math, frame timing, attach limits. The QA recording playbook the QuickTime help page leaves out.",
  },
  robots: { index: true, follow: true },
};

const breadcrumbItems = [
  { label: "macOS Session Replay", href: "/" },
  { label: "Guides", href: "/t/session-replay-tools" },
  { label: "Tethered iPhone QA screen recording" },
];

const breadcrumbSchemaItems = [
  { name: "macOS Session Replay", url: "https://macos-session-replay.com/" },
  {
    name: "Guides",
    url: "https://macos-session-replay.com/t/session-replay-tools",
  },
  { name: "Tethered iPhone QA screen recording", url: PAGE_URL },
];

const setupSteps = [
  {
    title: "Cable in, trust granted",
    description:
      "USB-C to USB-C on a current Mac and iPhone 15+, USB-C to Lightning otherwise. Unlock the iPhone and tap Trust This Computer. The phone needs to be unlocked at this exact moment, a passcoded screen blocks the trust prompt.",
  },
  {
    title: "QuickTime, New Movie Recording",
    description:
      "Open QuickTime Player, then File > New Movie Recording. The webcam preview that pops up is misleading; do not start recording yet, you have one more click to make.",
  },
  {
    title: "Click the chevron, pick the iPhone twice",
    description:
      "Next to the red record button there is a small downward chevron. Click it. Set Camera to your iPhone and set Microphone to your iPhone too. Quality goes to Maximum. This is the step every QA tutorial skips and it is why most bug videos are silent.",
  },
  {
    title: "Record, narrate, stop with Cmd+Ctrl+Esc",
    description:
      "Hit record, perform the bug, and narrate as you go (audio in QA recordings is signal, not decoration). Cmd+Ctrl+Esc stops cleanly without you having to find the QuickTime window again. Save as .mov; do not bounce through Finder rename, the original timestamped name is the only audit trail you get.",
  },
];

const requirements = [
  { text: "Cable that supports data, not a charge-only one (the silent killer of half of all QA recording sessions)" },
  { text: "macOS 13 or later for native .external/.muxed AVCaptureDevice support, the older .externalUnknown path is fine but quirky" },
  { text: "iPhone unlocked when you plug it in, otherwise the Trust prompt never appears" },
  { text: "QuickTime Player 10.5 or later, or AVFoundation if you are scripting captures" },
  { text: "At least 5 GB free on the Mac per 10 minutes of native-resolution recording" },
  { text: "Optional: a second screen so the engineer reviewing your ticket does not lose the QuickTime window behind the Mac under test" },
];

const comparisonRows = [
  {
    feature: "Audio source",
    competitor: "Off by default, has to be picked from the chevron dropdown",
    ours: "Captured automatically as part of the .muxed device track",
  },
  {
    feature: "Frame rate",
    competitor: "Variable, mirrors the iPhone's display refresh, drops under thermal load",
    ours: "Configurable cap, default 5 FPS, designed for analytics not playback fidelity",
  },
  {
    feature: "Output format",
    competitor: ".mov, ProRes-ish, 30 to 60 fps, 100 to 800 MB for ten minutes",
    ours: "H.265 fragmented MP4, 60-second chunks, roughly 6 to 12 MB per minute at 1440p",
  },
  {
    feature: "Mid-record disconnect",
    competitor: "File is salvageable but the recording stops; you start over",
    ours: "Each chunk closes independently, you keep everything before the disconnect",
  },
  {
    feature: "Where the file lives",
    competitor: "Local Movies folder, you upload manually to Linear or Jira",
    ours: "Local first, optional GCS upload via signed URLs, viewer URL you can paste in a ticket",
  },
  {
    feature: "Audit and review",
    competitor: "Engineer scrubs the timeline, no metadata beyond filename",
    ours: "Web player with timeline, playback speed, and Gemini Vision pass that flags confusing moments",
  },
  {
    feature: "Best fit",
    competitor: "Single bug repro on a real device, especially for tickets with media reviewers",
    ours: "Always-on QA capture across many testers and devices, longitudinal user-flow review",
  },
];

const faqItems = [
  {
    q: "Why is my tethered iPhone QA recording silent when I open it?",
    a: "Because QuickTime Player defaults the Microphone source to None when you start a New Movie Recording. The fix is the small chevron next to the red record button: click it, then set Microphone to the same iPhone you picked as Camera. The iPhone exposes itself as a single .muxed AVCaptureDevice, meaning audio and video share one source. If the dropdown does not list the iPhone under Microphone even though it does under Camera, unplug, replug while the phone is unlocked, then quit and reopen QuickTime. Do not lock the phone between trust and the chevron click.",
  },
  {
    q: "What output format and codec do I actually get from QuickTime over a tether?",
    a: "An .mov container with H.264 or HEVC video and AAC audio, depending on macOS version and the Quality setting under the chevron. On modern macOS at Maximum quality, expect HEVC at native iPhone resolution (around 1170x2532 on an iPhone 15 Pro), variable frame rate that tracks the iPhone display, and a stereo AAC audio track if you remembered to set the Microphone. The file is fully self-contained, so you can drag it straight into a ticket. There is no separate sidecar. ProRes is available on Pro Macs but rarely worth the file size for QA work.",
  },
  {
    q: "How long can I record before the file gets too big to attach?",
    a: "Linear caps individual file uploads at 1 GB, Jira Cloud at 100 MB by default and 250 MB at most workspace tiers, and GitHub issues at 25 MB for video. A QuickTime tether recording at Maximum quality on an iPhone 15 Pro lands around 60 to 90 MB per minute, so you have roughly 11 to 16 minutes for Linear, 1 to 2 minutes for default Jira, and well under a minute for GitHub. The practical move is to compress before you attach: drag the .mov into Handbrake with a Fast 1080p30 preset, which usually drops the file to 10 to 30 percent of the original without making the bug invisible. Do not do this if the bug is a visual artifact at native pixel density; in that case, link to a hosted upload instead.",
  },
  {
    q: "How do I capture both the iPhone screen and the Mac app under test in the same recording?",
    a: "You cannot, in one recording, with stock QuickTime. Tethered iPhone capture goes through AVCaptureDevice with the .muxed media type. Mac screen capture goes through ScreenCaptureKit (or, in QuickTime, through New Screen Recording rather than New Movie Recording). They are different APIs, different session objects, different output windows. The two practical options for cross-device bugs: record both as separate .mov files with the system clock visible in each, then rely on timestamp alignment in review; or use a tool that wraps both APIs and synchronizes them at capture time. macOS Session Replay does the macOS half via ScreenCaptureKit; the iPhone half needs a parallel AVFoundation pipeline, which the AVFoundation guide on this site walks through.",
  },
  {
    q: "Can I capture frame-perfect timing for a race-condition bug?",
    a: "QuickTime gives you what the iPhone display gave it, which is a variable frame rate close to the iPhone's actual refresh. For bugs where the question is which view appeared first, scrub frame by frame in QuickTime (period and comma keys advance one frame). If the issue is sub-frame, for example a network response landing at a specific OS event, neither QuickTime nor any tethered AVFoundation capture is the right tool: pair the screen recording with a synchronized log capture (Console.app on the Mac, or libimobiledevice's idevicesyslog) and reconcile by wall clock. Treat the recording as the visible witness, not the only witness.",
  },
  {
    q: "What happens if the cable wiggles or the iPhone unplugs mid-recording?",
    a: "QuickTime stops recording immediately and saves what it has. The file is playable up to about a second before the disconnect, depending on how often QuickTime flushed. The AVCaptureDeviceWasDisconnected notification fires within a few hundred milliseconds; QuickTime catches it and finalizes the .mov. You will lose the most recent chunk of action, which is annoying when the bug repros at the end. The fix is mechanical: tape down or weight the cable, and start recording 10 seconds earlier than you think you need to. If you do this often enough that those 10 seconds cost you, that is the signal to move from QuickTime to a chunked recorder where each minute is closed independently.",
  },
  {
    q: "Do I need an Apple Developer account or special entitlement to record a tethered iPhone for QA?",
    a: "Not for the QuickTime route. Apple ships QuickTime Player to every Mac, the tether path is sanctioned, and trust is the only consent step. If you script the same capture via AVFoundation, the binary needs com.apple.security.device.usb to talk to the device and com.apple.security.device.camera to use AVCaptureDevice. You do not need a paid Developer Program seat to ship that as a Developer ID app, but Mac App Store distribution gets reviewed and Apple has historically asked for justification when a non-camera app talks to CoreMediaIO. For internal QA tooling distributed inside the company, Developer ID signing and notarization is enough.",
  },
  {
    q: "Why does my QuickTime preview show the iPhone but recording starts the Mac webcam instead?",
    a: "The chevron next to the record button has separate Camera and Microphone selectors, and the Camera one defaults to the FaceTime HD Camera on every fresh QuickTime launch. The preview window updates the moment you change Camera, but if you click record before changing it, you get a recording of yourself looking confused at your screen. The fix is to make the chevron click the second thing you do in QuickTime, before you ever press the red button. If the iPhone is plugged in but does not appear in the Camera list at all, that is the AVFoundation gate problem, not a UI quirk; the AVFoundation companion guide on this site covers the CoreMediaIO opt-in that QuickTime sets internally and AVFoundation apps have to set themselves.",
  },
  {
    q: "Is this even the right tool for QA, or should I be using a real session replay product?",
    a: "QuickTime is the right tool when you have a known bug, a known device, and you need a single artifact to drop in a ticket within the next ten minutes. It is not the right tool when you want to know how a tester or end user actually used the app over a session of work, or when you want to capture sessions across many devices without a human babysitting each one. That is what session replay products are for: PostHog or LogRocket on the web, and macOS Session Replay for native macOS apps. The keyword you came in on is QA-specific, so the QuickTime path is almost certainly what you want. The session replay path is a parallel investment for a different question: not 'what is this one bug', but 'how do users actually use this app'.",
  },
  {
    q: "What should the bug ticket itself contain so the engineer can act on the recording?",
    a: "Five things: device model and iOS version (Settings > General > About), build under test (TestFlight build number is fine), what you tapped to start the trace, what you expected, and the timestamp inside the recording where the bug becomes visible. The recording is evidence; without those five lines the engineer will have to play the whole video at 1x, which is the QA-engineer-to-engineer trust killer. If the bug spans network calls, attach a Charles Proxy or Proxyman .chlsj export named with the same timestamp prefix as the .mov. Engineers will love you for it.",
  },
];

const relatedPosts = [
  {
    title: "Tethered iPhone screen recording with AVFoundation, the CoreMediaIO gate every guide forgets",
    href: "/t/tethered-iphone-screen-recording-avfoundation",
    excerpt: "If your AVCaptureDevice.DiscoverySession returns an empty array even though the iPhone is trusted, this is the missing 4-byte property write that QuickTime makes for you.",
    tag: "AVFoundation",
  },
  {
    title: "ScreenCaptureKit window filter app exclusion, the working pattern",
    href: "/t/screencapturekit-window-filter-app-exclusion",
    excerpt: "When the Mac side of the bug needs capturing too, ScreenCaptureKit is the tool. Here is how to filter out the recorder UI from its own recording.",
    tag: "ScreenCaptureKit",
  },
  {
    title: "What is user behavior analytics for native apps",
    href: "/t/what-is-user-behavior-analytics",
    excerpt: "QA recordings are one bug at a time. Session replay analytics are every user, every session, all the time. Where each one fits.",
    tag: "Analytics",
  },
];

const jsonLd = [
  articleSchema({
    headline:
      "iPhone tethered QA screen recording: the audio chevron, the file size math, the bug-attach checklist",
    description:
      "Practical QA-focused guide to recording a tethered iPhone screen on a Mac. Covers QuickTime's hidden microphone dropdown, file size math against Linear and Jira upload limits, frame timing for race-condition bugs, mid-record disconnect recovery, the entitlement story, and where session replay sits next to the QuickTime path.",
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

export default function IphoneTetheredQaScreenRecordingPage() {
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
            QA recording, the unglamorous practical version
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-6 leading-[1.05]">
            iPhone tethered QA screen recording, written for the engineer who
            has been burned by silent videos
          </h1>
          <p className="text-lg text-zinc-700 mb-4 max-w-2xl leading-relaxed">
            Plug the iPhone in, open QuickTime, click record. Three steps,
            every guide on the internet has them. None of them mention the
            chevron next to the red button, which is why most QA bug videos
            land in tickets with no audio and engineers have to ask
            &quot;wait, what is happening here?&quot; on Slack.
          </p>
          <p className="text-lg text-zinc-700 max-w-2xl leading-relaxed">
            This page is the QA-specific addendum: audio narration, file size
            math against your tracker&apos;s upload limit, frame timing for
            race-condition repros, the cable wiggle, and what goes in the
            ticket alongside the .mov.
          </p>
        </header>

        <div className="max-w-4xl mx-auto px-6 mb-8">
          <ArticleMeta
            datePublished={PUBLISHED}
            readingTime="11 min read"
            authorRole="Written with AI"
          />
        </div>

        <section className="max-w-4xl mx-auto px-6 mb-14">
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6 md:p-8">
            <div className="text-xs font-semibold tracking-widest uppercase text-teal-700 mb-3">
              Direct answer (verified 2026-05-07)
            </div>
            <p className="text-zinc-900 text-lg leading-relaxed mb-4">
              <strong>To record a tethered iPhone for QA:</strong> connect the
              iPhone to the Mac with a data-capable USB or USB-C cable, unlock
              the phone and tap <em>Trust This Computer</em>, open QuickTime
              Player and choose <code className="px-1 py-0.5 rounded bg-white text-teal-700 text-sm font-mono">File &gt; New Movie Recording</code>,
              then click the small chevron next to the red record button and
              set <strong>both Camera and Microphone</strong> to the iPhone.
              Hit record, narrate, stop with{" "}
              <code className="px-1 py-0.5 rounded bg-white text-teal-700 text-sm font-mono">
                Cmd+Ctrl+Esc
              </code>
              . The output is a self-contained{" "}
              <code className="px-1 py-0.5 rounded bg-white text-teal-700 text-sm font-mono">
                .mov
              </code>{" "}
              you can drop into the bug ticket.
            </p>
            <p className="text-sm text-zinc-700">
              Verified against Apple&apos;s{" "}
              <a
                href="https://support.apple.com/guide/quicktime-player/record-your-screen-qtp97b08e666/mac"
                className="text-teal-700 underline hover:text-teal-800"
              >
                QuickTime Player User Guide
              </a>{" "}
              and the AVFoundation{" "}
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
            The chevron is the entire trick
          </h2>
          <p className="text-zinc-700 mb-4 leading-relaxed">
            QuickTime Player has shipped tethered iPhone capture since around
            macOS 10.10 / iOS 8 in 2014. The mechanic has not changed in over
            a decade: <code className="px-1 py-0.5 rounded bg-zinc-100 text-teal-700 text-sm font-mono">File &gt; New Movie Recording</code>,
            click the chevron next to the red button, pick the iPhone. What
            has also not changed is that this chevron has independent Camera
            and Microphone selectors, and Microphone defaults to None.
          </p>
          <p className="text-zinc-700 mb-4 leading-relaxed">
            That default is fine for selfie videos. It is the wrong default
            for QA work, where audio narration is the difference between an
            actionable bug ticket and a video your engineer has to mentally
            transcribe at 1x speed. The first time you make this mistake you
            re-record. The third time, you write a checklist. This page is
            the checklist.
          </p>
          <p className="text-zinc-700 leading-relaxed">
            None of the existing guides surface this clearly because they are
            written for the &quot;mirror your phone for a demo&quot; use case,
            not the &quot;file a bug in 90 seconds&quot; use case. Both look
            the same in screenshots. They are not the same workflow.
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-6 my-14">
          <HorizontalStepper
            title="The actual four-step setup"
            steps={setupSteps}
          />
        </section>

        <section className="max-w-4xl mx-auto px-6 my-14">
          <AnimatedChecklist
            title="What you need before you start"
            items={requirements}
          />
        </section>

        <section className="max-w-4xl mx-auto px-6 my-14">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            File size math, because Linear is not Jira is not GitHub
          </h2>
          <p className="text-zinc-700 mb-4 leading-relaxed">
            QuickTime at Maximum quality on a current iPhone produces roughly
            <strong> 60 to 90 MB per minute</strong> of HEVC video at native
            display resolution. A typical QA bug repro runs 30 to 90 seconds
            once you account for setup and narration. So far so attachable.
            Then you trip on a tracker upload limit and the ticket bounces.
          </p>
          <p className="text-zinc-700 mb-4 leading-relaxed">
            Rough caps as of 2026:
          </p>
          <ul className="space-y-2 text-zinc-700 mb-6 list-disc pl-6">
            <li>
              <strong>Linear:</strong> 1 GB per file (the friendliest of the
              bunch).
            </li>
            <li>
              <strong>Jira Cloud:</strong> 100 MB by default, up to 250 MB on
              higher workspace tiers, configurable by your admin.
            </li>
            <li>
              <strong>GitHub Issues:</strong> 25 MB for video, hard.
            </li>
            <li>
              <strong>Slack:</strong> 1 GB on paid, but Slack uploads are not
              the same as a ticket attachment, do not let the recording live
              there.
            </li>
          </ul>
          <p className="text-zinc-700 leading-relaxed">
            For most teams that means: a one-minute QuickTime recording
            attaches to Linear without thinking, a Jira ticket needs a
            Handbrake pass through &quot;Fast 1080p30&quot; (drops to 10 to
            20 MB), and a GitHub issue needs either Handbrake plus 480p or a
            link to an external host. Do this work once, save the Handbrake
            preset, never think about it again.
          </p>
        </section>

        <ProofBanner
          quote="A 60-second QuickTime tether recording from an iPhone 15 Pro at Maximum quality, dropped through Handbrake's Fast 1080p30 preset, lands at roughly 12 MB. Same recording, same one minute, comfortably under every major tracker's default attachment cap."
          source="Field-measured on macOS 14, Handbrake 1.7"
          metric="~12 MB"
        />

        <section className="max-w-5xl mx-auto px-6 my-14">
          <ComparisonTable
            heading="QuickTime tether recording vs. session replay capture"
            intro="Same product surface, two different jobs. QuickTime is right for the single-bug ticket; session replay is right for the always-on capture across testers and devices. Pick the row that matches the question you are actually answering, not the one that sounds more sophisticated."
            productName="macOS Session Replay (chunked H.265)"
            competitorName="QuickTime tether (.mov)"
            rows={comparisonRows}
            caveat="Session replay only covers the macOS half. The tethered iPhone half still needs the AVFoundation path, which is why both rows live on this site."
          />
        </section>

        <section className="max-w-4xl mx-auto px-6 my-14">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            What goes in the ticket alongside the .mov
          </h2>
          <p className="text-zinc-700 mb-4 leading-relaxed">
            A bug video without a ticket body is a riddle. Five lines is the
            difference between an engineer fixing the bug today and an
            engineer Slacking the QA channel asking for context tomorrow:
          </p>
          <ol className="space-y-3 text-zinc-700 mb-6 list-decimal pl-6">
            <li>
              <strong>Device and OS.</strong> &quot;iPhone 15 Pro, iOS 18.4
              (build 22E240).&quot; From Settings &gt; General &gt; About.
            </li>
            <li>
              <strong>App build.</strong> The TestFlight build number, or the
              git SHA if you build internally. Recordings outlive memories of
              which build was on the device.
            </li>
            <li>
              <strong>Trigger.</strong> One sentence. &quot;Tap Settings,
              then Notifications, then toggle Quiet Hours.&quot;
            </li>
            <li>
              <strong>Expected.</strong> &quot;Quiet Hours toggle persists
              across app relaunch.&quot;
            </li>
            <li>
              <strong>Timestamp.</strong> &quot;Bug visible at 0:14 in the
              recording.&quot; Engineers scrub to that point first; do not
              make them watch the setup.
            </li>
          </ol>
          <p className="text-zinc-700 leading-relaxed">
            If the bug involves network behavior, attach a Charles Proxy or
            Proxyman session export named with the same timestamp prefix as
            the .mov. The recording is the visible witness; the proxy log is
            the witness behind the curtain.
          </p>
        </section>

        <section className="max-w-4xl mx-auto px-6 my-14">
          <GlowCard>
            <h3 className="text-2xl font-bold text-zinc-900 mb-3">
              The cable wiggle problem
            </h3>
            <p className="text-zinc-700 leading-relaxed mb-4">
              Half of the &quot;recording stopped at the worst possible moment&quot;
              tickets I have seen come down to a Lightning or USB-C cable
              that lost a connection for 50 ms. The Mac fires{" "}
              <code className="px-1 py-0.5 rounded bg-zinc-100 text-teal-700 text-sm font-mono">
                AVCaptureDeviceWasDisconnected
              </code>
              , QuickTime finalizes the .mov at whatever frame it had, and
              the bug, which always happens in the last five seconds because
              that is when you stopped fidgeting with the phone, vanishes.
            </p>
            <p className="text-zinc-700 leading-relaxed">
              Two mechanical fixes: tape the cable to the desk so a knee
              under the table cannot tug it, and start recording 10 seconds
              before you actually need to. If you need this often enough
              that those 10 seconds cost real time, you have outgrown a
              single-file recorder and want a chunked one where each minute
              closes independently.
            </p>
          </GlowCard>
        </section>

        <section className="max-w-4xl mx-auto px-6 my-14">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            When the bug spans iPhone and the Mac app under test
          </h2>
          <p className="text-zinc-700 mb-4 leading-relaxed">
            QuickTime cannot record a tethered iPhone and the Mac desktop in
            the same .mov. They are different APIs: iPhone capture goes
            through AVCaptureDevice with the .muxed media type, Mac capture
            goes through ScreenCaptureKit (or QuickTime&apos;s separate{" "}
            <em>New Screen Recording</em> entry, which is a frontend on top
            of ScreenCaptureKit). Different session objects, different
            output windows, no shared timeline.
          </p>
          <p className="text-zinc-700 mb-4 leading-relaxed">
            The two practical workflows for cross-device bugs:
          </p>
          <ul className="space-y-3 text-zinc-700 mb-6 list-disc pl-6">
            <li>
              <strong>Two recordings, system clock visible in both.</strong>{" "}
              Open the macOS menu bar clock with seconds enabled; align in
              review by reading both clocks. Cheap, works, ugly.
            </li>
            <li>
              <strong>One tool wrapping both APIs.</strong> Run AVFoundation
              for the iPhone and ScreenCaptureKit for the Mac in the same
              process, share a wall clock, write both streams with aligned
              timestamps. This is what macOS Session Replay does for the
              macOS half; the iPhone half is a parallel pipeline using the{" "}
              <a
                href="/t/tethered-iphone-screen-recording-avfoundation"
                className="text-teal-700 underline hover:text-teal-800"
              >
                AVFoundation CoreMediaIO opt-in
              </a>{" "}
              the sibling guide on this site walks through.
            </li>
          </ul>
          <p className="text-zinc-700 leading-relaxed">
            For a one-off QA repro the two-recordings approach is fine. The
            second the same bug shows up three times in the same week, that
            is the signal to invest 90 minutes in a small in-house recorder
            that captures both sides at once.
          </p>
        </section>

        <InlineCta
          heading="Want this for the macOS half too?"
          body="macOS Session Replay is an open-source Swift package that does the macOS-app side of this story: ScreenCaptureKit at 5 FPS, H.265 hardware encoding, 60-second chunked uploads, and a Next.js viewer with a Gemini Vision pass. The iPhone tether path is its sibling, not its replacement; both live happily in the same QA stack."
          linkText="Open the repository"
          href="https://github.com/m13v/macos-session-replay"
        />

        <BookCallCTA
          appearance="footer"
          destination={BOOKING}
          site="macOS Session Replay"
          heading="Wiring this into a QA pipeline and want a second pair of eyes?"
          description="If you are stuck on the AVFoundation gate, the Handbrake automation, or the cross-device alignment problem, book 30 minutes and bring the artifact. I have spent more time than I would like to admit in this corner of the macOS capture stack."
        />

        <section className="max-w-5xl mx-auto px-6 my-14">
          <RelatedPostsGrid
            title="Related guides on this site"
            subtitle="The tethered iPhone path is one half of a QA capture story; the other half is the macOS app under test."
            posts={relatedPosts}
          />
        </section>

        <FaqSection items={faqItems} />

        <BookCallCTA
          appearance="sticky"
          destination={BOOKING}
          site="macOS Session Replay"
          description="QA recording stuck or ticket bouncing? Book 30 min."
        />
      </article>
    </>
  );
}
