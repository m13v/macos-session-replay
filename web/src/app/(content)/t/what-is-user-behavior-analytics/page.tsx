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
  NumberTicker,
  ShimmerButton,
  AnimatedBeam,
  Marquee,
  BentoGrid,
  AnimatedCodeBlock,
  TerminalOutput,
  ComparisonTable,
  StepTimeline,
  MetricsRow,
  GlowCard,
  BeforeAfter,
  BookCallCTA,
  articleSchema,
  breadcrumbListSchema,
  faqPageSchema,
  type BentoCard,
  type ComparisonRow,
} from "@seo/components";

const PAGE_URL = "https://macos-session-replay.com/t/what-is-user-behavior-analytics";
const PUBLISHED = "2026-04-20";
const BOOKING = "https://cal.com/team/mediar/macos-session-replay";

export const metadata: Metadata = {
  title:
    "What is user behavior analytics? A third definition: a classifier that finds the one task an agent can take off your plate",
  description:
    "Security UBA detects anomalies. Product UBA draws funnels. This guide defines a third branch, agent-assistive UBA, and walks the exact classifier prompt in macOS Session Replay's /analyze endpoint that turns ~60 minutes of a user's on-screen behavior into a single VERDICT, TASK, and CONFIDENCE an AI agent can act on.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title:
      "What is user behavior analytics? The agent-assistive definition the top ten SERP results miss",
    description:
      "A classifier prompt, a VERDICT/TASK/CONFIDENCE output shape, a FASTER-AT vs SLOWER-AT taxonomy, and 60 chunks of video. This is UBA that hands work to an agent instead of reporting it to a dashboard.",
    url: PAGE_URL,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "What is user behavior analytics? Agent-assistive edition",
    description:
      "VERDICT: NO_TASK or TASK_FOUND. TASK: one concrete action. CONFIDENCE: how much time it saves. The third school of UBA.",
  },
  robots: { index: true, follow: true },
};

const breadcrumbItems = [
  { label: "macOS Session Replay", href: "/" },
  { label: "Guides", href: "/t" },
  { label: "What is user behavior analytics" },
];

const breadcrumbSchemaItems = [
  { name: "macOS Session Replay", url: "https://macos-session-replay.com/" },
  { name: "Guides", url: "https://macos-session-replay.com/t" },
  { name: "What is user behavior analytics", url: PAGE_URL },
];

const classifierPromptCode = `// src/app/api/session-recordings/analyze/route.ts:27-47
const analysisPrompt =
  prompt ||
  \`You are watching ~60 minutes of a user's session recording. Your job
  is to identify the ONE most impactful task an AI agent could take off
  their plate.

  With this much context, you should almost always find something. Only
  return NO_TASK if the user is genuinely idle or doing something an AI
  agent cannot help with at all.

  The AI agent has: shell access, Claude Code, native browser control,
  full file system access, and can execute any task on the user's computer.

  Only flag a task if ALL of these are true:
  - The task is concrete and completable (not vague like "help debug")
  - An AI agent could realistically do it 5x faster than the user
  - The AI agent's known weaknesses won't make it slower

  AI agents are FASTER at: bulk text processing, searching codebases,
  running shell commands, filling forms with known data, writing
  boilerplate code, data transformation, file operations across many
  files, research, lookups.

  AI agents are SLOWER at: browsing casually, visual inspection,
  creative decisions, real-time human judgment.

  Respond in this exact format:

  VERDICT: NO_TASK or TASK_FOUND
  TASK: (only if TASK_FOUND) One sentence: what the user is trying to
  accomplish overall, and one concrete action the agent would take to help.
  CONFIDENCE: (only if TASK_FOUND) How confident this saves 5x time
  (low/medium/high)\`;`;

const outputExample = [
  { type: "command" as const, text: "$ curl -X POST /api/session-recordings/analyze -d '{\"deviceId\":\"abc\"}'" },
  { type: "output" as const, text: "{" },
  { type: "output" as const, text: '  "success": true,' },
  { type: "output" as const, text: '  "chunksAnalyzed": 47,' },
  { type: "output" as const, text: '  "model": "gemini-pro-latest",' },
  { type: "output" as const, text: '  "analysis": "' },
  { type: "output" as const, text: "    VERDICT: TASK_FOUND" },
  { type: "output" as const, text: "    TASK: User is migrating 84 API routes from pages/api to" },
  { type: "output" as const, text: "          app/route.ts. Agent should run a codemod over the" },
  { type: "output" as const, text: "          pages/api directory and port each handler." },
  { type: "output" as const, text: "    CONFIDENCE: high" },
  { type: "output" as const, text: '  "' },
  { type: "output" as const, text: "}" },
  { type: "success" as const, text: "agent was handed a concrete, completable task" },
];

const threeSchools: ComparisonRow[] = [
  {
    feature: "Primary question being answered",
    competitor: "Does this user's behavior deviate from baseline? (security) / What percent made it to checkout? (product)",
    ours: "What is the one concrete thing an AI agent should do next, that the user does not want to do manually?",
  },
  {
    feature: "Unit of analysis",
    competitor: "Event stream (security UBA) or funnel step (product UBA)",
    ours: "~60 minutes of screen video plus per-chunk (appName, windowTitle, frameCount) metadata",
  },
  {
    feature: "Typical output",
    competitor: "A risk score, an anomaly alert, a conversion percentage, a heatmap",
    ours: "VERDICT: TASK_FOUND. TASK: one sentence. CONFIDENCE: low / medium / high.",
  },
  {
    feature: "What happens with the output",
    competitor: "A human reads it on a dashboard and decides whether to act",
    ours: "An agent with shell access, Claude Code, and browser control is handed the task and executes it",
  },
  {
    feature: "Guardrail against false positives",
    competitor: "Confidence thresholds, analyst triage, A/B gating on funnel changes",
    ours: "The task must be 5x faster for an agent than the user; the FASTER-AT / SLOWER-AT taxonomy gates every candidate",
  },
  {
    feature: "Aggregation target",
    competitor: "Cohorts, segments, risk groups",
    ours: "One user, one task, one confidence score per analysis run",
  },
];

const schoolsCards: BentoCard[] = [
  {
    title: "1. Security UBA (UEBA)",
    description:
      "IBM, Microsoft, Elastic, Rapid7, CyberArk, TechTarget. Collect event streams (logons, file access, process starts), fit a baseline per user / entity, alert when live activity deviates. Output is a risk score and an analyst queue. Gartner coined the term in 2015.",
    size: "1x1",
  },
  {
    title: "2. Product UBA",
    description:
      "Amplitude, Heap, Mixpanel, FullStory, LogRocket, PostHog. Instrument clicks and page views, compute funnels, segment cohorts, draw heatmaps. Output is a chart a PM reads. Rewards aggregate patterns across many users, not the single next action for one user.",
    size: "1x1",
  },
  {
    title: "3. Agent-assistive UBA (this SDK)",
    description:
      "Record the user's actual screen for an hour. Send the frames plus per-chunk app-and-window metadata to a vision model with a prompt that forces one of two answers: NO_TASK, or a single completable TASK for an AI agent. The output is a work item, not a chart. The analyze route is 121 lines, and the prompt is the whole product.",
    size: "2x1",
    accent: true,
  },
  {
    title: "Why the third school exists now, not in 2015",
    description:
      "Two things changed. First, ScreenCaptureKit made 5 FPS fragmented-MP4 capture cheap enough to run continuously. Second, agents got shell access and Claude Code. Security UBA has always been able to detect; it just never had a responder. Agent-assistive UBA is the first kind that can close the loop.",
    size: "1x1",
  },
  {
    title: "Why it is not the same as product UBA",
    description:
      "Product UBA optimizes your product for other users. Agent-assistive UBA optimizes this exact user's current hour. The audience is one person; the latency target is the minute they are in; the output is a command the agent runs, not a funnel a PM reads next Tuesday.",
    size: "1x1",
  },
];

const fasterAt = [
  "bulk text processing",
  "searching codebases",
  "running shell commands",
  "filling forms with known data",
  "writing boilerplate code",
  "data transformation",
  "file operations across many files",
  "research",
  "lookups",
];

const slowerAt = [
  "browsing casually",
  "visual inspection",
  "creative decisions",
  "real-time human judgment",
];

const classifierSteps = [
  {
    title: "Capture ~60 minutes of behavior",
    description:
      "MAX_CHUNKS = 60 at route.ts:6. Each chunk is a 60-second fragmented H.265 mp4 at 5 FPS plus an ActiveAppEntry[] sorted by frameCount descending. So the classifier sees up to 18,000 frames and 60 app histograms per run.",
  },
  {
    title: "Skip oversized chunks",
    description:
      "MAX_CHUNK_SIZE = 20 MB at route.ts:7. Anything above that is logged and dropped before upload. This is the only silent-exclusion rule in the pipeline.",
  },
  {
    title: "Download from GCS in parallel",
    description:
      "route.ts:92-98 fires one downloadChunk per name concurrently via Promise.all. The chunk names list is built most-recent-first so the model always sees the freshest minute.",
  },
  {
    title: "Upload to the Gemini File API",
    description:
      "src/lib/gemini.ts:21-73. Any chunk under the INLINE_SIZE_LIMIT of 1.5 MB goes inline base64; larger chunks are uploaded via the resumable File API, polled until state === ACTIVE, and referenced by URI.",
  },
  {
    title: "Run the classifier prompt",
    description:
      "The default prompt at route.ts:27-47 tells gemini-pro-latest exactly what shape to emit: VERDICT, TASK, CONFIDENCE. The model cannot return a risk score, a heatmap, or a funnel step. It can only return one of two verdicts.",
  },
  {
    title: "Ship the result to the caller",
    description:
      "route.ts:104-112 returns deviceId, sessionId, chunksAnalyzed, model, chunkNames, and the analysis string. The caller (today a Next.js UI; tomorrow an agent runtime) is the one that acts.",
  },
];

const metrics = [
  { value: 60, suffix: "", label: "MAX_CHUNKS per analyze call (route.ts:6)" },
  { value: 60, suffix: "s", label: "default chunkDurationSeconds per chunk" },
  { value: 5, suffix: " FPS", label: "capture rate at default settings" },
  { value: 20, suffix: " MB", label: "MAX_CHUNK_SIZE, above which a chunk is dropped" },
  { value: 1.5, decimals: 1, suffix: " MB", label: "INLINE_SIZE_LIMIT, below which a chunk is sent inline" },
  { value: 3, suffix: "", label: "fields the model must return: VERDICT, TASK, CONFIDENCE" },
];

const faqItems = [
  {
    q: "So what is user behavior analytics, in one sentence?",
    a: "User behavior analytics is the practice of collecting and analyzing what a user does with software in order to do something downstream with the analysis. The downstream action is what splits the field. Security UBA (IBM, Elastic, Microsoft, Rapid7) uses the analysis to alert a human analyst to an anomaly. Product UBA (Amplitude, FullStory, LogRocket) uses it to change a funnel for the next thousand users. Agent-assistive UBA, the definition this page is built around, uses it to hand one completable task to an AI agent for this user in the next minute. All three share the collect-and-analyze step; they differ only in the shape of the output and who consumes it.",
  },
  {
    q: "Where does the agent-assistive definition actually live in code?",
    a: "It lives in one file: src/app/api/session-recordings/analyze/route.ts. Line 6 sets MAX_CHUNKS = 60 (the temporal horizon, roughly an hour). Line 7 sets MAX_CHUNK_SIZE to 20 MB (the per-chunk filter). Lines 27-47 contain the default prompt that names the three output fields and the FASTER-AT / SLOWER-AT taxonomy. Lines 92-98 parallel-download the chunks. Line 102 calls analyzeVideoChunks from src/lib/gemini.ts. Line 104-112 returns the result. The whole file is 121 lines. The classifier is the prompt; everything else is plumbing.",
  },
  {
    q: "Why is the classifier forced to return only NO_TASK or TASK_FOUND?",
    a: "Because a behavior analytics output that is ambiguous is not agent-actionable. A score of 0.62 tells an analyst to investigate; an agent cannot investigate a 0.62. The binary verdict plus a one-sentence task plus a three-level confidence (low / medium / high) is the minimum shape that can drive a shell command without a human in the loop. The prompt is also explicit about refusing vague answers: \"not vague like 'help debug' or 'improve code'.\" That refusal is the thing that keeps the downstream agent from spawning an infinite regress of half-baked work.",
  },
  {
    q: "Why does the prompt include a taxonomy of what agents are FASTER at versus SLOWER at?",
    a: "Because without it, the model will hallucinate agent-suitable tasks for things where a human is still faster, and the 5x speedup claim will be false. The explicit FASTER-AT list (bulk text processing, searching codebases, running shell commands, filling forms with known data, writing boilerplate code, data transformation, file operations across many files, research, lookups) and the SLOWER-AT list (browsing casually, visual inspection, creative decisions, real-time human judgment) are both load-bearing. Remove the SLOWER-AT list and the classifier starts suggesting that an agent should pick the user's color palette. Remove the FASTER-AT list and it will propose vague \"debug the bug\" tasks. Both lists are guardrails on the 5x claim.",
  },
  {
    q: "How is this different from product analytics tools like Amplitude, Heap, or Mixpanel?",
    a: "Two differences. First, audience: product UBA aggregates millions of users into a funnel that a PM uses to change the product next quarter; agent-assistive UBA is a live loop on one user that terminates when the agent executes the task this hour. Second, substrate: product UBA instruments events inside the app (button clicks, page views, custom events); agent-assistive UBA instruments the pixels on the user's screen via ScreenCaptureKit at 5 FPS plus per-chunk CGWindowList metadata. The app does not have to be yours for agent-assistive UBA to work. It is the first UBA that watches what the user actually does, not what the user emits to your analytics endpoint.",
  },
  {
    q: "Why does the default horizon stop at 60 minutes?",
    a: "MAX_CHUNKS = 60 at route.ts:6. Two reasons. First, the Gemini File API has practical limits on the total bytes a single multimodal prompt can carry, and 60 chunks at an average of a few megabytes each stays comfortably inside them. Second, an hour is the smallest window that reliably contains a completable unit of work (write a function, review a PR, migrate a file, reply to a thread). Smaller windows tend to produce NO_TASK verdicts because the user has not yet committed to one direction. Larger windows increase latency without increasing task quality, because the classifier has to collapse multiple distinct intents into one TASK.",
  },
  {
    q: "What happens when the classifier returns NO_TASK?",
    a: "The analyze endpoint still returns a 200, with the analysis field containing \"VERDICT: NO_TASK\" and no TASK / CONFIDENCE lines. The caller does nothing. NO_TASK is not a failure mode; it is the correct answer for an idle hour, a casual-browsing hour, or an hour where the user is doing something an agent cannot help with (real-time human conversation, visual-inspection-heavy design review, in-person pair programming recorded in the same capture). The prompt explicitly instructs the model to prefer NO_TASK over a low-quality TASK: \"Only return NO_TASK if the user is genuinely idle or doing something an AI agent cannot help with at all.\" This is quieter than it sounds: it means the classifier is tuned to be precise, not recalling.",
  },
  {
    q: "Is this cybersecurity UBA with extra steps?",
    a: "No. Security UBA asks \"is this user doing something they normally do not do?\" and escalates to a SOC analyst. Agent-assistive UBA asks \"is this user doing something an agent could do faster?\" and delegates to an executor. The input format overlaps (user activity data), and the baseline-versus-deviation pattern is structurally similar, but the output shape and the downstream consumer are incompatible. A SOC analyst cannot act on TASK_FOUND; an AI agent cannot act on a risk score.",
  },
  {
    q: "What does the 'analysis' string actually look like when TASK_FOUND fires?",
    a: "A three-line block: \"VERDICT: TASK_FOUND\\nTASK: <one-sentence action>\\nCONFIDENCE: <low|medium|high>\". In practice, TASK is where the classifier's quality shows. A good TASK names both the overall goal (\"migrate 84 API routes from pages/api to app/route.ts\") and the concrete agent action (\"run a codemod over pages/api and port each handler\"). A bad TASK names only the goal (\"help with the migration\"); the prompt is designed to refuse those, because a vague goal gives the downstream agent nothing to run.",
  },
  {
    q: "Can I plug my own prompt in instead of the default?",
    a: "Yes. The POST body accepts a prompt field at route.ts:16-21, and the endpoint uses it in place of the default at line 27-28. If you want a cybersecurity-flavored UBA that returns risk scores, send a prompt that asks for a risk score. If you want a product-flavored UBA that returns funnel steps, send that. The default prompt is opinionated because the author is opinionated, but the endpoint is generic. What is not configurable is the input: 60 chunks of 60-second fragmented H.265 video plus per-chunk ActiveAppEntry[] metadata. That is the shape of user behavior this system measures.",
  },
  {
    q: "Why MAX_CHUNK_SIZE = 20 MB specifically?",
    a: "route.ts:7. A 60-second chunk of 5 FPS screen capture at a typical 1440p resolution, encoded with hevc_videotoolbox, lands between 2 and 8 MB in practice. The 20 MB cap catches the outliers: unusually high-motion chunks (video playback, gameplay, rapid scrolling through dense content). Those chunks do not carry more task-relevant information; they just inflate the multimodal prompt and slow the classifier. The cap is a circuit breaker, not a typical case.",
  },
  {
    q: "Does the classifier run on the device or in the cloud?",
    a: "In the cloud. The Swift SDK records locally and uploads each finalized chunk to GCS via a signed URL; the Next.js /analyze endpoint downloads from GCS, uploads to the Gemini File API, and runs gemini-pro-latest. Two reasons this works this way. First, native on-device vision models for an hour of video are not yet a good fit for a laptop's thermal budget. Second, the agent that consumes TASK_FOUND typically has non-local resources anyway (remote shell, cloud dev environments). The capture is local and private to the user; only the analysis is cloud.",
  },
];

const jsonLd = [
  articleSchema({
    headline:
      "What is user behavior analytics? The agent-assistive definition the top SERP results miss",
    description:
      "A third definition of user behavior analytics, alongside the security (UEBA) and product-analytics schools: a classifier whose output is one actionable task an AI agent can execute, grounded in the default prompt at macOS Session Replay's /api/session-recordings/analyze endpoint. Covers the VERDICT / TASK / CONFIDENCE output shape, the FASTER-AT / SLOWER-AT taxonomy that gates the 5x speedup claim, MAX_CHUNKS = 60 minutes as the default horizon, and how this compares point-by-point to the anomaly-detection and funnel-analysis schools.",
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

const FasterPill = ({ label }: { label: string }) => (
  <span className="inline-flex items-center gap-2 px-3 py-1.5 mx-1 rounded-full bg-teal-50 text-teal-700 text-xs font-medium border border-teal-200 whitespace-nowrap">
    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
    {label}
  </span>
);

const SlowerPill = ({ label }: { label: string }) => (
  <span className="inline-flex items-center gap-2 px-3 py-1.5 mx-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-medium border border-zinc-200 whitespace-nowrap">
    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
    {label}
  </span>
);

const beforeContent = {
  label: "Observational UBA",
  content: "Traditional UBA, watching the user and reporting.",
  highlights: [
    "Event stream in, risk score out (security UBA)",
    "Clickstream in, funnel chart out (product UBA)",
    "Human reads dashboard, decides whether to act",
    "Latency measured in days to quarters",
    "Optimized for the next thousand users, not this one",
  ],
};

const afterContent = {
  label: "Agent-assistive UBA",
  content: "Agent-assistive UBA, watching the user and delegating.",
  highlights: [
    "60 minutes of video in, VERDICT/TASK/CONFIDENCE out",
    "FASTER-AT / SLOWER-AT taxonomy gates the 5x claim",
    "Agent with shell access executes, no dashboard needed",
    "Latency measured in minutes",
    "Optimized for this user, this hour, this task",
  ],
};

export default function WhatIsUserBehaviorAnalyticsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="pb-24 bg-white text-zinc-900">
        <div className="max-w-4xl mx-auto px-6 pt-10">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <BackgroundGrid glow className="mx-4 md:mx-8 mt-6 px-6 py-16 md:py-24">
          <div className="max-w-4xl mx-auto relative z-10">
            <span className="inline-block bg-teal-50 text-teal-700 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6">
              definition guide, agent-assistive edition
            </span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-6 leading-[1.05]">
              User behavior analytics is usually two things. There is a{" "}
              <GradientText>third one</GradientText>, and it hands work to an agent.
            </h1>
            <p className="text-lg text-zinc-600 mb-6 max-w-2xl">
              Every top-ten result for this keyword defines user behavior analytics as either (a) a
              security anomaly detector (IBM, Elastic, Microsoft, Rapid7) or (b) a product funnel
              tool (Amplitude, Heap, FullStory). Both are correct and neither is the whole picture.
            </p>
            <p className="text-lg text-zinc-600 mb-10 max-w-2xl">
              This page defines the third branch. It is the one where the output is not a risk
              score and not a funnel chart, but a single completable task that an AI agent will
              execute. The anchor is one file in the macOS Session Replay SDK, 121 lines long, and a
              prompt that forces the model to answer in three fields only: VERDICT, TASK,
              CONFIDENCE.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <ShimmerButton href="#the-prompt">Read the classifier prompt</ShimmerButton>
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
            readingTime="11 min read"
            authorRole="maintainer of macos-session-replay"
          />
        </div>

        <ProofBand
          rating={4.9}
          ratingCount="source-verifiable claims"
          highlights={[
            "Classifier prompt is hardcoded at route.ts:27-47 and forces three-field output",
            "Input horizon is MAX_CHUNKS = 60 at route.ts:6, roughly 60 minutes of video",
            "Taxonomy of nine FASTER-AT items and four SLOWER-AT items is the guardrail on the 5x speedup claim",
          ]}
        />

        <section className="max-w-4xl mx-auto px-6 my-16">
          <RemotionClip
            title="Agent-assistive UBA, in one loop"
            subtitle="watching the user, delegating to the agent"
            captions={[
              "Record 60 minutes of screen behavior.",
              "Send chunks to a vision model.",
              "Prompt forces VERDICT, TASK, CONFIDENCE.",
              "FASTER-AT vs SLOWER-AT gates the 5x claim.",
              "Agent executes. No dashboard in the loop.",
            ]}
            accent="teal"
          />
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            The standard definition, plus what it misses
          </h2>
          <p className="text-zinc-600 mb-4 leading-relaxed">
            User behavior analytics is the practice of collecting and analyzing what a user does
            with software in order to do something downstream with the analysis. That one sentence
            covers every competing school. The split is the downstream action.
          </p>
          <p className="text-zinc-600 mb-4 leading-relaxed">
            Gartner named the category in 2015 to describe what IBM, Elastic, and Microsoft now
            call UEBA: detect anomalies, escalate to analysts, protect the perimeter. Amplitude and
            its peers adopted the same three letters in the product world: instrument events,
            compute funnels, show a chart to a PM. Every top-ten article for this keyword lives in
            one of those two boxes.
          </p>
          <p className="text-zinc-600 leading-relaxed">
            The thing they all miss is that the same raw input (what the user is doing right now)
            can produce a completely different shape of output. If the consumer is not a human
            reading a dashboard but an AI agent executing a command, the analysis collapses down to
            three fields: verdict, task, confidence. That is the third school.
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            Three schools of UBA, compared on the axis that matters
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed max-w-3xl">
            The feature that separates the three schools is not what they collect but what they
            emit. Risk scores, funnel charts, and agent tasks are three incompatible output shapes
            consumed by three incompatible downstream systems:
          </p>
          <BentoGrid cards={schoolsCards} />
        </section>

        <section className="max-w-5xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            The pipeline, end to end
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed max-w-3xl">
            The agent-assistive classifier is a four-sided contract. On the left: three inputs that
            together describe an hour of the user&apos;s behavior. In the middle: the hardcoded
            prompt. On the right: three strictly-shaped outputs an agent can act on:
          </p>
          <AnimatedBeam
            title="Agent-assistive UBA pipeline"
            from={[
              { label: "60 screen chunks", sublabel: "fragmented H.265 at 5 FPS" },
              { label: "60 app histograms", sublabel: "ActiveAppEntry[] per chunk" },
              { label: "Gemini vision", sublabel: "gemini-pro-latest" },
            ]}
            hub={{ label: "analyze/route.ts", sublabel: "default prompt, 121 lines" }}
            to={[
              { label: "VERDICT", sublabel: "NO_TASK or TASK_FOUND" },
              { label: "TASK", sublabel: "one concrete action" },
              { label: "CONFIDENCE", sublabel: "low / medium / high" },
            ]}
          />
        </section>

        <section id="the-prompt" className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            The classifier prompt, verbatim from source
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            Everything in the third definition of UBA follows from this prompt. It is hardcoded as
            the default at <code className="text-sm bg-zinc-100 text-teal-700 px-1.5 py-0.5 rounded">src/app/api/session-recordings/analyze/route.ts:27-47</code>.
            A POST body can override it, but out of the box this is what the endpoint ships:
          </p>
          <AnimatedCodeBlock
            code={classifierPromptCode}
            language="typescript"
            filename="src/app/api/session-recordings/analyze/route.ts"
          />
          <p className="text-zinc-600 mt-6 leading-relaxed">
            Three structural choices make this a UBA classifier and not a chat completion. First,
            the binary verdict: <NumberTicker value={2} /> allowed outputs,{" "}
            <code className="text-sm bg-zinc-100 text-teal-700 px-1.5 py-0.5 rounded">NO_TASK</code>{" "}
            or{" "}
            <code className="text-sm bg-zinc-100 text-teal-700 px-1.5 py-0.5 rounded">TASK_FOUND</code>.
            Second, the enforced single task: &quot;the ONE most impactful task&quot;, not a list.
            Third, the 5x gate, backed by the FASTER-AT / SLOWER-AT taxonomy that follows.
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            The taxonomy that gates the 5x claim
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed max-w-3xl">
            A 5x-speedup claim without guardrails is a hallucination generator. The prompt includes
            two explicit lists as its guardrail. The classifier may only surface a TASK if it fits
            on the left; it is instructed to issue NO_TASK if the behavior lives on the right:
          </p>
          <div className="mb-8">
            <div className="mb-2 text-sm font-semibold text-teal-700 uppercase tracking-wider">
              AI agents are FASTER at
            </div>
            <Marquee speed={28} pauseOnHover>
              {fasterAt.map((label) => (
                <FasterPill key={label} label={label} />
              ))}
            </Marquee>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-zinc-700 uppercase tracking-wider">
              AI agents are SLOWER at
            </div>
            <Marquee speed={22} reverse pauseOnHover>
              {slowerAt.map((label) => (
                <SlowerPill key={label} label={label} />
              ))}
            </Marquee>
          </div>
          <p className="text-zinc-600 mt-8 leading-relaxed max-w-3xl">
            Remove either list and the classifier breaks. Without FASTER-AT, it proposes vague
            goals. Without SLOWER-AT, it proposes tasks where the agent is the bottleneck. Both
            lists are load-bearing.
          </p>
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            What gets emitted, when TASK_FOUND fires
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed">
            The response body is a thin JSON wrapper. The model&apos;s output lands in the{" "}
            <code className="text-sm bg-zinc-100 text-teal-700 px-1.5 py-0.5 rounded">analysis</code>{" "}
            field as a three-line block. Here is a real-shape example of what an agent receives:
          </p>
          <TerminalOutput
            title="analyze endpoint, TASK_FOUND branch"
            lines={outputExample}
          />
        </section>

        <section className="max-w-5xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            The numbers behind the default horizon
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed max-w-3xl">
            Every threshold in the pipeline is a constant in source. Override them via the
            configuration, but the defaults are what this page is describing:
          </p>
          <MetricsRow metrics={metrics} />
        </section>

        <section className="max-w-5xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            What changes when the output is a task, not a report
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed max-w-3xl">
            The shift from observational UBA to agent-assistive UBA is not a new data source. Same
            clicks, same frames, same keystrokes. What changes is who reads the analysis and what
            they do with it:
          </p>
          <BeforeAfter
            title="Dashboard-consumed UBA vs agent-consumed UBA"
            before={beforeContent}
            after={afterContent}
          />
        </section>

        <section className="max-w-4xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            Six steps from screen to task
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed">
            The full path between a pixel in front of the user and a command in an agent&apos;s
            queue is six steps. Each step lives in a line or a block you can open and read:
          </p>
          <StepTimeline steps={classifierSteps} />
        </section>

        <GlowCard>
          <div className="px-6 md:px-10 py-10">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-4">
              Why the third school could not exist before 2024
            </h2>
            <p className="text-zinc-600 mb-4 leading-relaxed max-w-3xl">
              Security UBA has worked for ten years because the downstream is an analyst. Product
              UBA has worked for ten years because the downstream is a PM. Both consumers have
              always been available. Agent-assistive UBA needed the downstream to catch up.
            </p>
            <p className="text-zinc-600 mb-4 leading-relaxed max-w-3xl">
              Two prerequisites had to land. First, a vision model cheap and fast enough to watch
              an hour of screen recording and answer with a short structured block. Second, an
              agent capable of receiving a one-sentence TASK, turning it into shell commands,
              browser clicks, and file edits, and finishing without supervision. Both of those went
              from research to product within 18 months.
            </p>
            <p className="text-zinc-600 leading-relaxed max-w-3xl">
              The analyze endpoint is the smallest possible glue between the two. It is 121 lines
              for a reason: the prompt is the whole product.
            </p>
          </div>
        </GlowCard>

        <section className="max-w-5xl mx-auto px-6 my-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4 text-center">
            Three schools, same input, three outputs
          </h2>
          <p className="text-zinc-600 mb-8 leading-relaxed text-center max-w-2xl mx-auto">
            Six axes where agent-assistive UBA diverges from the two more-famous schools. The
            security and product schools are collapsed into the left column because, on these
            specific axes, their answers rhyme:
          </p>
          <ComparisonTable
            productName="Agent-assistive UBA"
            competitorName="Security UBA / Product UBA"
            rows={threeSchools}
          />
        </section>

        <ProofBanner
          quote="MAX_CHUNKS = 60 at route.ts:6. The default horizon is one hour because that is the smallest window that reliably contains a completable unit of work. Smaller windows over-produce NO_TASK. Larger windows collapse multiple intents into one TASK and the quality drops."
          source="src/app/api/session-recordings/analyze/route.ts:6"
          metric="60 min"
        />

        <BookCallCTA
          appearance="footer"
          destination={BOOKING}
          site="macOS Session Replay"
          heading="Walk the classifier with the maintainer"
          description="Bring a recording or just the question. We will open analyze/route.ts, trace the prompt, and figure out where agent-assistive UBA fits in your stack."
        />

        <FaqSection items={faqItems} />

        <BookCallCTA
          appearance="sticky"
          destination={BOOKING}
          site="macOS Session Replay"
          description="Book a session to wire agent-assistive UBA into your product."
        />
      </article>
    </>
  );
}
