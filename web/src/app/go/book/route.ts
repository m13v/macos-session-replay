import { createBookCallRedirectHandler } from "@seo/components/server";

export const GET = createBookCallRedirectHandler({
  site: "macos-session-replay",
  fallbackBookingUrl: "https://cal.com/team/mediar/macos-session-replay",
});
