import { ClerkProvider } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SessionRecordingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
