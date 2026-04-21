"use client";
import { SitemapSidebar } from "@seo/components";
import type { PageEntry } from "@seo/components/server";

export function SitemapSidebarClient({ pages }: { pages: PageEntry[] }) {
  return <SitemapSidebar pages={pages} brandName="macOS Session Replay" />;
}
