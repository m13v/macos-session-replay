import { walkPages } from "@seo/components/server";
import { SitemapSidebarClient } from "./site-sidebar-client";

export function SiteSidebar() {
  const pages = walkPages({ excludePaths: ["api"] });
  return <SitemapSidebarClient pages={pages} />;
}
