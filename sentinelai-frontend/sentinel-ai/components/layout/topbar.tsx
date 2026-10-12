"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, LogOut, UserCog } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ROLE_CATALOGUE } from "@/lib/mock/organization";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

export function Topbar() {
  const { user, role, setRole } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const switchableRoles = ROLE_CATALOGUE.filter((r) => r.role !== "super_admin");

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-ink px-5">
      <div>
        <p className="text-sm text-mute">
          <span className="font-medium text-paper">Viewing as</span> — demo role switcher below changes what you can see
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Role switcher: the whole point of this control is to make PRD §62's
           RBAC story ("switch to a restricted employee account") clickable. */}
        <div className="relative">
          <button
            onClick={() => {
              setRoleMenuOpen((v) => !v);
              setUserMenuOpen(false);
            }}
            className="flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm text-paper hover:bg-panel-raised"
          >
            <UserCog className="h-4 w-4 text-signal" />
            {ROLE_CATALOGUE.find((r) => r.role === role)?.label}
            <ChevronDown className="h-3.5 w-3.5 text-faint" />
          </button>
          {roleMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setRoleMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-72 rounded-md border border-line bg-panel p-1.5">
                {switchableRoles.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => {
                      setRole(r.role as Exclude<Role, "super_admin">);
                      setRoleMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full flex-col items-start rounded-md px-3 py-2 text-left hover:bg-panel-raised",
                      role === r.role && "bg-panel-raised"
                    )}
                  >
                    <span className="text-sm text-paper">{r.label}</span>
                    <span className="text-xs text-mute">{r.description}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button className="relative rounded-md p-2 text-mute hover:bg-panel-raised hover:text-paper" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-status-critical" />
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setUserMenuOpen((v) => !v);
              setRoleMenuOpen(false);
            }}
            className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-panel-raised"
          >
            <Avatar name={user.name} colorClass={user.avatarColor} size="sm" />
            <span className="text-sm text-paper">{user.name.split(" ")[0]}</span>
          </button>
          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-line bg-panel p-1.5">
                <div className="px-3 py-2">
                  <p className="text-sm text-paper">{user.name}</p>
                  <p className="text-xs text-mute">{user.email}</p>
                </div>
                <div className="my-1 border-t border-line" />
                <Link
                  href="/login"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-mute hover:bg-panel-raised hover:text-paper"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
