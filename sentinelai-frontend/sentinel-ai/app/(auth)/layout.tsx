import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-gold" />
        <span className="font-display text-sm font-semibold text-paper">SentinelAI</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
