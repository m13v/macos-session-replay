import { createGuideChatHandler } from "@seo/components/server";

export const POST = createGuideChatHandler({
  app: "macos-session-replay",
  brand: "macOS Session Replay",
  siteDescription:
    "Open-source session replay SDK for native macOS Swift apps. ScreenCaptureKit at 5 FPS, H.265 hardware encoding, Gemini Vision analysis.",
  contentDir: "src/app/(content)/t",
});
