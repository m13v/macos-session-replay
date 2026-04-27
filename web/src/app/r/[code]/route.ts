import { createDmShortLinkRedirectHandler } from "@seo/components/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = createDmShortLinkRedirectHandler({ site: "macos-session-replay" });
