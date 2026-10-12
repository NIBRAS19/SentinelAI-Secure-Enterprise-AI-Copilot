"use client";

import { useState } from "react";
import { ShieldAlert, Ban, Fingerprint, Lock, Gauge } from "lucide-react";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/form-elements";
import { SecurityEventsTable } from "@/components/security/security-components";
import { threatOverview, securityEvents, securityPolicies as seedPolicies } from "@/lib/mock/security-events";
import { formatNumber } from "@/lib/utils";

export default function SecurityPage() {
  const [tab, setTab] = useState("overview");
  const [policies, setPolicies] = useState(seedPolicies);

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Security" description="Threat detection, PII protection, and the policies enforcing both." />

      <Tabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "events", label: "Events" },
          { id: "policies", label: "Policies" },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className="pt-6">
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Prompt injection attempts" value={formatNumber(threatOverview.promptInjectionAttempts)} icon={ShieldAlert} />
              <StatCard label="Blocked requests" value={formatNumber(threatOverview.blockedRequests)} icon={Ban} />
              <StatCard label="PII detections" value={formatNumber(threatOverview.piiDetections)} icon={Fingerprint} />
              <StatCard label="Unauthorized retrievals" value={formatNumber(threatOverview.unauthorizedRetrievals)} icon={Lock} />
              <StatCard label="Rate limit events" value={formatNumber(threatOverview.rateLimitEvents)} icon={Gauge} />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Recent events</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <SecurityEventsTable events={securityEvents.slice(0, 5)} />
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "events" && (
          <Card className="overflow-hidden">
            <SecurityEventsTable events={securityEvents} />
          </Card>
        )}

        {tab === "policies" && (
          <Card>
            <CardHeader>
              <CardTitle>Security policies</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-line">
              {policies.map((p) => (
                <div key={p.id} className="py-1">
                  <Checkbox
                    checked={p.enabled}
                    onChange={(checked) =>
                      setPolicies((prev) => prev.map((x) => (x.id === p.id ? { ...x, enabled: checked } : x)))
                    }
                    label={p.label}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
