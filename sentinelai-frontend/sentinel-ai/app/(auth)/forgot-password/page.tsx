"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Input } from "@/components/ui/form-elements";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="flex flex-col items-center py-4 text-center">
            <MailCheck className="mb-3 h-8 w-8 text-status-safe" />
            <p className="text-sm text-paper">If that address has an account, a reset link is on its way.</p>
            <Link href="/login" className="mt-4 text-sm text-signal hover:underline">
              Back to log in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="reset-email">Email</Label>
              <Input id="reset-email" type="email" placeholder="you@company.com" required />
            </div>
            <Button type="submit" className="w-full">
              Send reset link
            </Button>
            <Link href="/login" className="block text-center text-sm text-mute hover:text-paper">
              Back to log in
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
