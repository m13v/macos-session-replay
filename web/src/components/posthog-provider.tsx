"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { SeoAnalyticsProvider } from "@m13v/seo-components";
import { useEffect } from "react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
const SITE_ID =
  process.env.NEXT_PUBLIC_POSTHOG_SITE_ID || "macos-session-replay";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (POSTHOG_KEY && typeof window !== "undefined") {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: "identified_only",
        capture_pageview: true,
        capture_pageleave: true,
        disable_session_recording: false,
        session_recording: {
          maskAllInputs: true,
          maskInputOptions: { password: true },
        },
        loaded: (ph) => {
          ph.group("site", SITE_ID);
          ph.register({ site: SITE_ID });
          window.dispatchEvent(new CustomEvent("posthog:loaded"));
        },
      });
      // MANDATORY: attach to window so @m13v/seo-components helpers
      // (NewsletterSignup, TrackedCta, trackScheduleClick, etc.) can fire
      // events. Without this, library window.posthog?.capture(...) calls
      // become silent no-ops.
      (window as unknown as { posthog: typeof posthog }).posthog = posthog;
    }
  }, []);

  if (!POSTHOG_KEY) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <SeoAnalyticsProvider posthog={posthog}>{children}</SeoAnalyticsProvider>
    </PHProvider>
  );
}

export { posthog };
