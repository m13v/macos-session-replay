import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "@/components/posthog-provider";
import { HeadingAnchors, GuideChatPanel } from "@seo/components";
import { SiteSidebar } from "@/components/site-sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Session Replay",
  description: "macOS Session Recording Viewer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <HeadingAnchors />
        <PostHogProvider>
          <div className="flex min-h-screen">
            <SiteSidebar />
            <div className="flex-1 min-w-0 flex flex-col">{children}</div>
            <GuideChatPanel />
          </div>
        </PostHogProvider>
      </body>
    </html>
  );
}
