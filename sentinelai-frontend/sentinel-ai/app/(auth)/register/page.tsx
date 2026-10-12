"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Input } from "@/components/ui/form-elements";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { setRole } = useAuth();
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Registering stands up a new organization, so the registrant becomes
    // its owner (PRD §43: Register → Create Organization → ...).
    setTimeout(() => {
      setRole("org_owner");
      router.push("/dashboard");
    }, 600);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your organization</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" defaultValue="Hind" required />
          </div>
          <div>
            <Label htmlFor="reg-email">Work email</Label>
            <Input id="reg-email" type="email" defaultValue="hind@acme-learning.example" required />
          </div>
          <div>
            <Label htmlFor="org">Organization name</Label>
            <Input id="org" defaultValue="Acme Learning & Consulting" required />
          </div>
          <div>
            <Label htmlFor="reg-password">Password</Label>
            <Input id="reg-password" type="password" placeholder="Any value works in this demo" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-mute">
          Already have an account?{" "}
          <Link href="/login" className="text-signal hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
