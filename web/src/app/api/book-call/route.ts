import { createBookCallHandler } from "@seo/components/server";

export const POST = createBookCallHandler({
  site: "macos-session-replay",
  audienceId: "",
  fromEmail: "Matt from Session Replay <matt@mediar.ai>",
  brand: "macOS Session Replay",
  siteUrl: "https://macos-session-replay.com",
  redirectBaseUrl: "https://macos-session-replay.com/go/book",
});
