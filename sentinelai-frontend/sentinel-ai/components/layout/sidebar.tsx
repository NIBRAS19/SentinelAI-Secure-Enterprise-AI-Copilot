"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  Bot,
  ClipboardCheck,
  ShieldAlert,
  History,
  BarChart3,
  Building2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

interface NavItem {
  section: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { section: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { section: "chat", label: "Chat", href: "/chat", icon: MessageSquare },
      { section: "knowledge", label: "Knowledge", href: "/knowledge", icon: BookOpen },
      { section: "agents", label: "Agents", href: "/agents", icon: Bot },
      { section: "approvals", label: "Approvals", href: "/approvals", icon: ClipboardCheck },
    ],
  },
  {
    label: "Security",
    items: [
      { section: "security", label: "Security", href: "/security", icon: ShieldAlert },
      { section: "audit", label: "Audit log", href: "/audit", icon: History },
    ],
  },
  {
    label: "Administration",
    items: [
      { section: "usage", label: "Usage", href: "/usage", icon: BarChart3 },
      { section: "admin", label: "Administration", href: "/admin", icon: Building2 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { hasAccess, organization } = useAuth();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-panel md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-line px-5">
        <ShieldCheck className="h-5 w-5 text-gold" />
        <span className="font-display text-sm font-semibold tracking-tight text-paper">SentinelAI</span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV.map((group) => {
          const visibleItems = group.items.filter((item) => hasAccess(item.section));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="px-2.5 text-xs font-medium text-faint">{group.label}</p>
              <div className="mt-1.5 space-y-0.5">
                {visibleItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                        active ? "bg-panel-raised text-paper" : "text-mute hover:bg-panel-raised hover:text-paper"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", active ? "text-gold" : "text-faint")} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-line px-5 py-4">
        <p className="truncate text-xs font-medium text-paper">{organization.name}</p>
        <p className="text-xs text-faint">{organization.plan} plan</p>
      </div>
    </aside>
  );
}
