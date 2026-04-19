export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white text-zinc-900 min-h-screen relative z-10">
      {children}
    </div>
  );
}
