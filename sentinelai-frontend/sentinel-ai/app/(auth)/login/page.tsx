"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Input } from "@/components/ui/form-elements";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { ROLE_CATALOGUE } from "@/lib/mock/organization";
import type { Role } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const { setRole } = useAuth();
  const [email, setEmail] = useState("nibras@acme-learning.example");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // No real backend behind this build — simulate a brief round trip,
    // then land on the dashboard as whichever role is currently selected.
    setTimeout(() => router.push("/dashboard"), 500);
  }

  const quickRoles = ROLE_CATALOGUE.filter((r) => r.role !== "super_admin");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label htmlFor="password" className="mb-0">
                  Password
                </Label>
                <Link href="/forgot-password" className="text-xs text-signal hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Any value works in this demo"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-mute">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-signal hover:underline">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick demo access</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-mute">
            There&apos;s no real backend behind this build — jump in as any role to see how access and the RBAC
            demo change.
          </p>
          <div className="space-y-1.5">
            {quickRoles.map((r) => (
              <button
                key={r.role}
                onClick={() => {
                  setRole(r.role as Exclude<Role, "super_admin">);
                  router.push("/dashboard");
                }}
                className="block w-full rounded-md border border-line px-3 py-2 text-left hover:bg-panel-raised"
              >
                <span className="block text-sm text-paper">{r.label}</span>
                <span className="block text-xs text-faint">{r.description}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
