"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useAuth } from "@/lib/auth-context";
import { AccessRestricted } from "@/components/ui/misc";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { hasAccess } = useAuth();

  // The path's first segment doubles as the nav "section" key (see
  // ROLE_ACCESS in lib/mock/organization.ts) — one check here gates every
  // page under it, mirroring PRD §31's layered authorization rather than
  // relying on each page to remember to check.
  const section = pathname.split("/")[1] || "dashboard";
  const allowed = hasAccess(section);

  return (
    <div className="flex h-screen overflow-hidden bg-ink">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          {allowed ? (
            children
          ) : (
            <div className="p-6 md:p-8">
              <AccessRestricted resource={`the ${section} section`} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
