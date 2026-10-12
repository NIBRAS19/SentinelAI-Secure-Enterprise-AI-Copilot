"use client";

import { useState } from "react";
import { Mail, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Label, Input, Select } from "@/components/ui/form-elements";
import { ALL_MEMBERS, ROLE_CATALOGUE, PERMISSIONS, ROLE_PERMISSIONS } from "@/lib/mock/organization";
import { useAuth } from "@/lib/auth-context";

export default function AdminPage() {
  const { organization } = useAuth();
  const [tab, setTab] = useState("members");
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Administration" description="Organization members, roles, and workspace settings." />

      <Tabs
        tabs={[
          { id: "members", label: "Members" },
          { id: "roles", label: "Roles & permissions" },
          { id: "organization", label: "Organization" },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className="pt-6">
        {tab === "members" && (
          <Card>
            <CardHeader>
              <CardTitle>Members ({ALL_MEMBERS.length})</CardTitle>
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <Mail className="h-4 w-4" />
                Invite
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className="px-5 py-2.5 text-xs font-medium text-mute">Name</th>
                      <th className="px-5 py-2.5 text-xs font-medium text-mute">Role</th>
                      <th className="px-5 py-2.5 text-xs font-medium text-mute">Status</th>
                      <th className="px-5 py-2.5 text-xs font-medium text-mute">Last active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_MEMBERS.map((m) => (
                      <tr key={m.id} className="border-b border-line/60">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={m.name} colorClass={m.avatarColor} size="sm" />
                            <div>
                              <p className="text-paper">{m.name}</p>
                              <p className="text-xs text-faint">{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-mute">{ROLE_CATALOGUE.find((r) => r.role === m.role)?.label}</td>
                        <td className="px-5 py-3">
                          <Badge tone={m.status === "active" ? "safe" : m.status === "invited" ? "warn" : "critical"}>
                            {m.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-faint">{m.lastActive}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "roles" && (
          <Card>
            <CardHeader>
              <CardTitle>Permission matrix</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="sticky left-0 bg-panel px-5 py-2.5 text-xs font-medium text-mute">Permission</th>
                    {ROLE_CATALOGUE.map((r) => (
                      <th key={r.role} className="whitespace-nowrap px-3 py-2.5 text-center text-xs font-medium text-mute">
                        {r.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSIONS.map((perm) => (
                    <tr key={perm} className="border-b border-line/60">
                      <td className="sticky left-0 bg-panel px-5 py-2.5 font-mono text-xs text-paper">{perm}</td>
                      {ROLE_CATALOGUE.map((r) => {
                        const has = r.role === "super_admin" ? true : ROLE_PERMISSIONS[r.role].includes(perm);
                        return (
                          <td key={r.role} className="px-3 py-2.5 text-center">
                            {has && <Check className="mx-auto h-3.5 w-3.5 text-status-safe" />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {tab === "organization" && (
          <Card>
            <CardHeader>
              <CardTitle>Organization profile</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Organization name</Label>
                <Input defaultValue={organization.name} readOnly />
              </div>
              <div>
                <Label>Slug</Label>
                <Input defaultValue={organization.slug} readOnly />
              </div>
              <div>
                <Label>Industry</Label>
                <Input defaultValue={organization.industry} readOnly />
              </div>
              <div>
                <Label>Plan</Label>
                <Input defaultValue={organization.plan} readOnly />
              </div>
              <div>
                <Label>Employees</Label>
                <Input defaultValue={String(organization.employeeCount)} readOnly />
              </div>
              <div>
                <Label>Created</Label>
                <Input defaultValue={organization.createdAt} readOnly />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a member">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setInviteOpen(false);
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" placeholder="name@company.com" required />
          </div>
          <div>
            <Label htmlFor="invite-role">Role</Label>
            <Select id="invite-role" defaultValue="member">
              {ROLE_CATALOGUE.filter((r) => r.role !== "super_admin").map((r) => (
                <option key={r.role} value={r.role}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" className="w-full">
            Send invite
          </Button>
        </form>
      </Modal>
    </div>
  );
}
