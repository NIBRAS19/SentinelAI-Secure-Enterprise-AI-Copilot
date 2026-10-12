"use client";

// SentinelAI has no real backend in this build, so there is no real
// session. This context simulates one: a "logged in" demo user whose
// role can be swapped from the topbar, so the RBAC and approval stories
// in PRD §62 are actually clickable rather than described in prose.
//
// Wiring a real backend later means replacing this file's internals
// (and nothing else) with a real session — every consumer just calls
// useAuth() and reads `.user` / `.hasAccess(section)`.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Role, User } from "@/lib/types";
import { DEFAULT_ROLE, DEMO_USERS, ROLE_ACCESS, organization } from "@/lib/mock/organization";

interface AuthContextValue {
  user: User;
  organization: typeof organization;
  role: Role;
  setRole: (role: Exclude<Role, "super_admin">) => void;
  hasAccess: (section: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "sentinelai.demo-role";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Server and first client render both start from DEFAULT_ROLE so there
  // is no hydration mismatch. If a different role was persisted from an
  // earlier visit, we swap to it right after mount.
  const [role, setRoleState] = useState<Exclude<Role, "super_admin">>(DEFAULT_ROLE as Exclude<Role, "super_admin">);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && saved in DEMO_USERS && saved !== role) {
        setRoleState(saved as Exclude<Role, "super_admin">);
      }
    } catch {
      // localStorage unavailable (private browsing, etc.) — fall back to default
    }
    // Only ever needs to run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRole = useCallback((next: Exclude<Role, "super_admin">) => {
    setRoleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const hasAccess = useCallback((section: string) => ROLE_ACCESS[role].includes(section), [role]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: DEMO_USERS[role],
      organization,
      role,
      setRole,
      hasAccess,
    }),
    [role, setRole, hasAccess]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
