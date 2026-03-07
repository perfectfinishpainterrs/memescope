import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-deep px-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 block text-center font-mono text-2xl font-bold tracking-widest text-neon-green"
        >
          MEMESCOPE
        </Link>
        <div className="rounded-lg border border-border bg-bg-panel p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
