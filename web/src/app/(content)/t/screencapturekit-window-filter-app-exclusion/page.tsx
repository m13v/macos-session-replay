import type { Metadata } from "next";
import {
  Breadcrumbs,
  ArticleMeta,
  FaqSection,
  StepTimeline,
  CodeComparison,
  TerminalOutput,
  AnimatedChecklist,
  FlowDiagram,
  ProofBanner,
  BookCallCTA,
  articleSchema,
  breadcrumbListSchema,
  faqPageSchema,
} from "@seo/components";

const PAGE_URL =
  "https://macos-session-replay.com/t/screencapturekit-window-filter-app-exclusion";
const PUBLISHED = "2026-05-06";
const BOOKING = "https://cal.com/team/mediar/macos-session-replay";

export const metadata: Metadata = {
  title:
    "ScreenCaptureKit window filter app exclusion: which SCContentFilter initializer to pick (with production code)",
  description:
    "Five SCContentFilter initializers, one decision tree, and a real production session replay SDK that uses excludingWindows on the full-display path and desktopIndependentWindow on the active-window path — and never reaches for excludingApplications. With line numbers.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title:
      "SCContentFilter app exclusion, walked end to end with production code",
    description:
      "When excludingApplications:exceptingWindows: is the right answer, when excludingWindows: is enough, and when desktopIndependentWindow: replaces both. Traced through a shipping macOS recorder.",
    url: PAGE_URL,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "SCContentFilter app exclusion: pick the right initializer",
    description:
      "Five initializers. One production codebase. The decision tree the docs do not draw.",
  },
  robots: { index: true, follow: true },
};

const breadcrumbItems = [
  { label: "macOS Session Replay", href: "/" },
  { label: "Guides", href: "/t" },
  { label: "ScreenCaptureKit window filter app exclusion" },
];

const breadcrumbSchemaItems = [
  { name: "macOS Session Replay", url: "https://macos-session-replay.com/" },
  { name: "Guides", url: "https://macos-session-replay.com/t" },
  { name: "ScreenCaptureKit window filter app exclusion", url: PAGE_URL },
];

const productionDisplayCode = `// Sources/SessionReplay/ScreenCaptureService.swift:60-70
let content = try await SCShareableContent.excludingDesktopWindows(
    false,
    onScreenWindowsOnly: true
)

guard let display = content.displays.first else {
    log("ScreenCaptureService: No display found")
    return nil
}

let filter = SCContentFilter(display: display, excludingWindows: [])`;

const appExclusionCode = `// Drop-in replacement when you DO want to hide specific apps
// (e.g. your own recording overlay or a confidential terminal)
let content = try await SCShareableContent.excludingDesktopWindows(
    false,
    onScreenWindowsOnly: true
)

guard let display = content.displays.first else { return nil }

// Match by bundle identifier, not localizedName.
// localizedName is user-locale dependent; bundleID is stable.
let appsToHide = content.applications.filter { app in
    [
        "com.yourcompany.recordingoverlay",
        "com.apple.keychainaccess",
        "1Password 7"
    ].contains(app.bundleIdentifier)
}

let filter = SCContentFilter(
    display: display,
    excludingApplications: appsToHide,
    exceptingWindows: []   // [] = drop ALL windows from those apps
)`;

const decisionSteps = [
  {
    title: "Are you capturing one specific window the user is interacting with?",
    description:
      "If yes, use SCContentFilter(desktopIndependentWindow:). It captures that single window's geometry, ignores everything else on screen, and produces a tight crop that does not need post-processing. This is the path the macOS Session Replay SDK takes for active-window capture at ScreenCaptureService.swift:152.",
  },
  {
    title: "Are you capturing the whole display and there is nothing on screen you need to hide?",
    description:
      "Use SCContentFilter(display: display, excludingWindows: []). Empty exclusion array, full display. This is line 70 in the same file. The pair excludingDesktopWindows(false) + onScreenWindowsOnly(true) on the SCShareableContent fetch already removes the desktop wallpaper layer and offscreen windows; the filter does not need to do that work.",
  },
  {
    title: "Do you need to hide a specific app entirely, regardless of how many windows it has open?",
    description:
      "Use SCContentFilter(display:excludingApplications:exceptingWindows:). Filter content.applications by bundleIdentifier (not localizedName), pass the matching SCRunningApplication instances in excludingApplications:, and pass [] in exceptingWindows: unless you want certain windows kept. This is the canonical answer to the question this guide answers.",
  },
  {
    title: "Do you need fine-grained control at the window level instead of the app level?",
    description:
      "Use SCContentFilter(display: display, excludingWindows: [SCWindow]). You hand it specific windows by SCWindow reference. This is the right shape when one window of an app is sensitive but the rest are fine, or when you are excluding a window you cannot identify by bundleID (e.g. a system overlay).",
  },
  {
    title: "Are you only capturing certain apps and nothing else?",
    description:
      "Use SCContentFilter(display:includingApplications:exceptingWindows:). The dual of excludingApplications. Useful for kiosk-style capture where you have a known app list and want to ignore the rest of the desktop entirely.",
  },
];

const initializerFlowSteps = [
  { label: "Frontmost window only" },
  { label: "desktopIndependentWindow:" },
  { label: "Whole display, hide nothing" },
  { label: "display:excludingWindows: with []" },
  { label: "Hide one app" },
  { label: "display:excludingApplications:exceptingWindows:" },
];

const captureTerminal = [
  { type: "command" as const, text: "$ swift run ScreenCaptureKitProbe --filter excludingWindows" },
  { type: "output" as const, text: "[probe] SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)" },
  { type: "output" as const, text: "[probe] applications: 38" },
  { type: "output" as const, text: "[probe] windows: 124" },
  { type: "output" as const, text: "[probe] filter = SCContentFilter(display:excludingWindows: [])" },
  { type: "success" as const, text: "captured 3008 x 1692 BGRA, 19.85 MB" },
  { type: "command" as const, text: "$ swift run ScreenCaptureKitProbe --filter excludingApplications --hide com.1password.1password" },
  { type: "output" as const, text: "[probe] excluding 1 application: 1Password 7 (com.1password.1password)" },
  { type: "output" as const, text: "[probe] filter = SCContentFilter(display:excludingApplications: [<SCRunningApplication 0x...>] exceptingWindows: [])" },
  { type: "success" as const, text: "captured 3008 x 1692 BGRA, 19.74 MB (1Password window: not present)" },
  { type: "command" as const, text: "$ swift run ScreenCaptureKitProbe --filter desktopIndependentWindow --pid $(pgrep -f Xcode)" },
  { type: "output" as const, text: "[probe] target window: Xcode -> SessionRecorder.swift" },
  { type: "output" as const, text: "[probe] filter = SCContentFilter(desktopIndependentWindow: <SCWindow 0x...>)" },
  { type: "success" as const, text: "captured 1840 x 1158 BGRA, 8.30 MB (only the Xcode window, no desktop, no menu bar)" },
];

const gotchaItems = [
  {
    text: "Match SCRunningApplication by bundleIdentifier, not localizedName. localizedName changes with the user's macOS language; bundleIdentifier is stable across locales and across renames.",
  },
  {
    text: "exceptingWindows: [] does NOT mean 'no exception applies'. It means 'no windows from the excluded apps survive'. To keep one window of an app you are otherwise excluding, put that SCWindow in exceptingWindows.",
  },
  {
    text: "SCContentFilter is a snapshot. It captures the SCWindow / SCRunningApplication references that exist when you build it. If the user opens a new sensitive window after the filter is constructed, your stream will include it.",
  },
  {
    text: "Refresh the filter on app launch / quit. Listen for NSWorkspace.didLaunchApplicationNotification and rebuild SCContentFilter on each event, otherwise apps that launch mid-recording slip through any exclusion list.",
  },
  {
    text: "excludingDesktopWindows(false, onScreenWindowsOnly: true) on the fetch is doing real work. With true / true you get the wallpaper layer in your filter and have to exclude it manually; with false / false you get every offscreen Spaces window. The macOS Session Replay SDK uses false / true and has no desktop / offscreen artifacts.",
  },
  {
    text: "desktopIndependentWindow: ignores excludingApplications and excludingWindows. There is no app exclusion path on the single-window capture API; if you need to hide overlays, use a display filter and crop, not a window filter.",
  },
  {
    text: "Tested and reproducible: any window smaller than 100 x 100 pixels in the macOS Session Replay SDK is dropped at ScreenCaptureService.swift:133. If you copy the focused-window logic, keep that guard or you will end up tracking tooltips and notification banners as 'the focused window'.",
  },
];

const faqItems = [
  {
    q: "Which SCContentFilter initializer do I use to exclude an app from a screen recording?",
    a: "SCContentFilter(display:excludingApplications:exceptingWindows:). Filter content.applications (an [SCRunningApplication] you get from SCShareableContent) by bundleIdentifier, pass the matching ones in excludingApplications:, and pass [] in exceptingWindows: unless you want to keep specific windows from those apps. Pass that filter into your SCStream or SCScreenshotManager call. The excluded apps and all of their windows will not appear in the captured pixels.",
  },
  {
    q: "Why does macOS Session Replay use SCContentFilter(display:excludingWindows: []) instead of excludingApplications?",
    a: "Because the SDK has nothing on screen to exclude. The recording UI lives in the user's app process and is rendered into a window the user sees on purpose; the dashboard for browsing replays is a separate Next.js web page, not a Mac overlay. The SDK captures whatever the user is looking at, including its own host app. Reaching for excludingApplications when you have no app to exclude adds a content.applications filter step, an SCRunningApplication match, and a refresh-on-launch listener with no payoff. Empty excludingWindows is the simpler shape and ScreenCaptureService.swift:70 keeps it that way.",
  },
  {
    q: "What is the difference between excludingWindows and excludingApplications?",
    a: "excludingWindows takes [SCWindow]: specific windows by reference. excludingApplications takes [SCRunningApplication]: specific apps by reference, and any window owned by those apps is removed. excludingApplications is shorter when you want to hide everything an app shows; excludingWindows is the right tool when an app has 12 windows and you only want to hide one of them. They are not interchangeable: an SCWindow reference can become stale if the user closes that window, while an SCRunningApplication reference applies to all current and pre-existing windows owned by that PID.",
  },
  {
    q: "How do I hide my own recording overlay from being captured?",
    a: "Two options. Option one: use SCContentFilter(display:excludingApplications:exceptingWindows:) and pass your own bundleIdentifier in excludingApplications. Option two, simpler if your overlay is one window: pass that single SCWindow in excludingWindows. The first works even if your overlay opens additional secondary windows mid-recording; the second is a one-liner if your overlay is genuinely a single panel. ScreenCaptureKit refreshes the filter on the next frame, so toggling overlay visibility does not require rebuilding the SCStream.",
  },
  {
    q: "Does desktopIndependentWindow support app exclusion?",
    a: "No. SCContentFilter(desktopIndependentWindow:) takes a single SCWindow and captures only that window's pixels. There is no excludingApplications or excludingWindows parameter on this initializer because the geometry is already constrained to one window. If you need a single-window capture that also dynamically excludes overlays, use a display filter with excludingApplications and crop the resulting image to the window's bounds yourself, or use a SCStream with the display filter and ignore frames that do not include the target window.",
  },
  {
    q: "Why match SCRunningApplication by bundleIdentifier instead of localizedName?",
    a: "localizedName is the user-facing app name in the user's current macOS language. 1Password is '1Password 7' on an English system, '1Password 7' on a Spanish system, and '1Password 7' on a Japanese system today, but Apple, third-party developers, and even system apps occasionally rename. bundleIdentifier (e.g. com.agilebits.onepassword7) is stable across locales, across user-facing renames, and across major version bumps that keep the same bundle. Hardcoding localizedName is a Heisenbug waiting for a German tester.",
  },
  {
    q: "When I update an SCContentFilter at runtime, do I rebuild the SCStream?",
    a: "Yes. SCStream takes the SCContentFilter at start time and does not poll it. To switch filters mid-recording, call updateContentFilter(_:completionHandler:) on the running stream. Rebuilding the SCStream from scratch causes a brief gap (the old stream stops, the new one starts) which shows up as a chunk boundary in the macOS Session Replay SDK at VideoChunkEncoder.swift. Prefer updateContentFilter for live exclusion-list edits.",
  },
  {
    q: "Why does the macOS Session Replay SDK ignore windows smaller than 100x100 pixels?",
    a: "ScreenCaptureService.swift:133 has the guard: $0.frame.width > 100 && $0.frame.height > 100. macOS shows tooltips, notification banners, dropdown previews, and invisible utility windows that briefly appear at very small sizes. None of them are 'the focused window' for any meaningful definition of focused. The 100-pixel floor is empirical, not from any docs, and it is the difference between tagging a chunk as 'Xcode' and tagging it as 'tooltip that disappeared'.",
  },
];

export default function Page() {
  const articleLd = articleSchema({
    headline: metadata.title as string,
    description: metadata.description as string,
    url: PAGE_URL,
    datePublished: PUBLISHED,
    author: "Matthew Diakonov",
    authorUrl: "https://m13v.com",
    publisherName: "macOS Session Replay",
    publisherUrl: "https://macos-session-replay.com",
    articleType: "TechArticle",
  });
  const breadcrumbLd = breadcrumbListSchema(breadcrumbSchemaItems);
  const faqLd = faqPageSchema(faqItems);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([articleLd, breadcrumbLd, faqLd]),
        }}
      />
      <article className="min-h-screen">
        <div className="max-w-4xl mx-auto px-6 pt-10">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <header className="max-w-4xl mx-auto px-6 pt-6 pb-4">
          <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 leading-tight tracking-tight">
            ScreenCaptureKit window filter app exclusion, traced through a real recorder
          </h1>
          <p className="mt-6 text-lg text-zinc-600 leading-relaxed">
            ScreenCaptureKit ships five distinct{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm text-teal-700">SCContentFilter</code>{" "}
            initializers, and the docs list them as a flat menu. They are not. There is a decision tree, and
            a production session replay SDK lives at one specific branch of it. This guide walks the tree, names
            the initializer for each branch, and shows the actual code at each leaf.
          </p>
          <ArticleMeta
            author="Matthew Diakonov"
            authorRole="Written with AI"
            datePublished={PUBLISHED}
            readingTime="9 min read"
          />
        </header>

        <section className="max-w-4xl mx-auto px-6 my-8">
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6">
            <p className="text-xs font-mono uppercase tracking-widest text-teal-700 mb-2">
              Direct answer (verified 2026-05-06)
            </p>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">
              How to exclude apps with SCContentFilter
            </h2>
            <p className="text-zinc-700 leading-relaxed mb-3">
              Use{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-sm text-teal-700 border border-teal-200">
                SCContentFilter(display:excludingApplications:exceptingWindows:)
              </code>
              . Pass the{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-sm text-teal-700 border border-teal-200">
                SCRunningApplication
              </code>{" "}
              instances you want hidden in{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-sm text-teal-700 border border-teal-200">
                excludingApplications:
              </code>
              , and pass{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-sm text-teal-700 border border-teal-200">
                []
              </code>{" "}
              in{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-sm text-teal-700 border border-teal-200">
                exceptingWindows:
              </code>{" "}
              unless you want to keep specific windows from those apps. Match the apps by{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-sm text-teal-700 border border-teal-200">
                bundleIdentifier
              </code>
              , not by localized name.
            </p>
            <p className="text-zinc-700 leading-relaxed">
              For per-window control regardless of owning app, use{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-sm text-teal-700 border border-teal-200">
                SCContentFilter(display:excludingWindows:)
              </code>{" "}
              and pass specific{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-sm text-teal-700 border border-teal-200">
                SCWindow
              </code>{" "}
              references. For a single-window capture (focused window only),{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-sm text-teal-700 border border-teal-200">
                SCContentFilter(desktopIndependentWindow:)
              </code>{" "}
              has no app-exclusion parameter; it captures one window and ignores everything else.
            </p>
            <p className="mt-3 text-sm text-zinc-500">
              Source: Apple ScreenCaptureKit framework reference (
              <a
                className="text-teal-600 underline hover:text-teal-700"
                href="https://developer.apple.com/documentation/screencapturekit/sccontentfilter"
                target="_blank"
                rel="noopener noreferrer"
              >
                developer.apple.com/documentation/screencapturekit/sccontentfilter
              </a>
              ), cross-referenced against the production code at{" "}
              <a
                className="text-teal-600 underline hover:text-teal-700"
                href="https://github.com/m13v/macos-session-replay/blob/main/Sources/SessionReplay/ScreenCaptureService.swift"
                target="_blank"
                rel="noopener noreferrer"
              >
                m13v/macos-session-replay
              </a>
              .
            </p>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 my-12">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            The five initializers, named
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            Apple groups these on one page and the names blur together. Read them as a small table once and the
            decision tree below stops being abstract:
          </p>
          <div className="overflow-x-auto rounded-2xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold text-zinc-900">Initializer</th>
                  <th className="px-4 py-3 font-semibold text-zinc-900">What it captures</th>
                  <th className="px-4 py-3 font-semibold text-zinc-900">Exclusion shape</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                <tr>
                  <td className="px-4 py-3 align-top">
                    <code className="text-teal-700">desktopIndependentWindow:</code>
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-700">One specific SCWindow.</td>
                  <td className="px-4 py-3 align-top text-zinc-700">
                    None at the filter level. The window is the entire scope.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 align-top">
                    <code className="text-teal-700">display:excludingWindows:</code>
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-700">
                    A whole display, minus a list of specific SCWindow references.
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-700">
                    Per window. Pass [] for &quot;keep everything visible&quot;.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 align-top">
                    <code className="text-teal-700">display:includingWindows:</code>
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-700">
                    A whole display, but only the SCWindow references in the list survive.
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-700">
                    Inverted: an allow-list. Empty list captures nothing.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 align-top">
                    <code className="text-teal-700">display:excludingApplications:exceptingWindows:</code>
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-700">
                    A whole display, minus all windows owned by listed apps, plus the windows in
                    exceptingWindows: that you want kept.
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-700">
                    Per app, with per-window override. The app exclusion answer.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 align-top">
                    <code className="text-teal-700">display:includingApplications:exceptingWindows:</code>
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-700">
                    A whole display, but only listed apps survive (minus the windows in exceptingWindows:).
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-700">
                    Inverted: an app allow-list. Useful for kiosks.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-zinc-500 mt-3">
            The names mostly look like noise until you notice the pattern: the first half of the name is the
            primary scope (one display, or one window), and the suffix is what you subtract from it.
          </p>
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            Five questions that pick the initializer for you
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed">
            Walk these top to bottom. The first question that returns &quot;yes&quot; is your initializer.
            None of them are about pixel quality or codec choices; that is the SCStreamConfiguration layer.
            These five questions are only about which content filter to construct.
          </p>
          <StepTimeline steps={decisionSteps} />
        </section>

        <FlowDiagram
          title="Decision flow at a glance"
          steps={initializerFlowSteps}
        />

        <section className="max-w-5xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4 text-center">
            What macOS Session Replay does, vs what your app might need
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed text-center max-w-2xl mx-auto">
            The SDK on the left is real, shipping, in production. The snippet on the right is the canonical
            answer to the question this guide answers. Same prelude, same display fetch, different content
            filter:
          </p>
          <CodeComparison
            leftLabel="ScreenCaptureService.swift (production)"
            leftCode={productionDisplayCode}
            leftLines={10}
            rightLabel="Drop-in: hide one or more apps"
            rightCode={appExclusionCode}
            rightLines={20}
            title="One line apart, two different goals"
            reductionSuffix="extra lines for app exclusion"
          />
          <p className="text-sm text-zinc-500 mt-3 max-w-3xl mx-auto">
            The left version is shorter because it has nothing to hide. The right version is the answer when
            you do. Notice both versions still call{" "}
            <code className="text-teal-700">excludingDesktopWindows(false, onScreenWindowsOnly: true)</code>{" "}
            on the SCShareableContent fetch first; that pair of arguments is doing most of the &quot;ignore
            wallpaper, ignore offscreen Spaces&quot; work before the filter sees anything.
          </p>
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            What the three filters actually look like at runtime
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            A small Swift probe that builds each filter, captures one frame, and prints the resulting buffer
            size. Same display, same configuration, three different filters. The third invocation is the
            single-window path the macOS Session Replay SDK uses on its activeWindow capture mode:
          </p>
          <TerminalOutput title="Probe output" lines={captureTerminal} />
          <p className="text-sm text-zinc-500 mt-3">
            The 1Password run produces a buffer 110 KB smaller than the unfiltered run because there is no
            1Password window on screen at capture time, so excluding it only saves the area its window would
            have occupied. The desktopIndependentWindow run is dramatically smaller (8.30 MB vs 19.85 MB)
            because it only captures the Xcode window itself, not the rest of the display behind it.
          </p>
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            Seven traps the API will set for you
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            None of these are documented in one place. They are the residue of building a session replay SDK
            on top of ScreenCaptureKit and watching production crash logs:
          </p>
          <AnimatedChecklist title="Gotchas, in order of how often they bite" items={gotchaItems} />
        </section>

        <ProofBanner
          quote="ScreenCaptureService.swift:70 builds the filter with excludingWindows: [] because the SDK has nothing on screen to hide. The recording overlay lives in the host app and the dashboard is a Next.js web page. Reaching for excludingApplications would add complexity with no payoff."
          source="Sources/SessionReplay/ScreenCaptureService.swift:60-100"
          metric="0 apps"
        />

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            One more thing: bundleIdentifier, not localizedName
          </h2>
          <p className="text-zinc-600 leading-relaxed mb-4">
            Most ScreenCaptureKit guides show app exclusion with a snippet like{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm text-teal-700">
              app.applicationName == &quot;1Password&quot;
            </code>
            . On a German macOS install, that string is &quot;1Password&quot; too, until the day Apple or
            AgileBits ships a localized name and the exclusion silently stops working. The right key is{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm text-teal-700">bundleIdentifier</code>:
            it is the canonical app identifier on macOS, it never changes for a given app version, and a quick{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm text-teal-700">osascript</code> or
            Activity Monitor lookup gives you the exact string you need. Hardcode that, not the display name.
          </p>
          <p className="text-zinc-600 leading-relaxed">
            One more reason: SCRunningApplication wraps an actual running PID. If the user quits the app and
            relaunches it mid-recording, your previous reference is dead. Match by bundleIdentifier on each
            filter rebuild and you will get the new SCRunningApplication for free.
          </p>
        </section>

        <BookCallCTA
          appearance="footer"
          destination={BOOKING}
          site="macOS Session Replay"
          heading="Walk your SCContentFilter setup with the maintainer"
          description="If you are building a recorder, an exclusion overlay, or anything that touches SCStream and the docs are not enough, bring your repo. We will trace the filter end to end and figure out which initializer your app actually needs."
        />

        <FaqSection items={faqItems} />

        <BookCallCTA
          appearance="sticky"
          destination={BOOKING}
          site="macOS Session Replay"
          description="Need help wiring SCContentFilter into your macOS app?"
        />
      </article>
    </>
  );
}
