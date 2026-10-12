import { ShieldOff, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-paper">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-mute">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-md border border-line bg-panel p-4">
      <div className="flex items-start justify-between">
        <span className="font-mono text-2xl tabular-nums text-paper">{value}</span>
        {Icon && <Icon className="h-4 w-4 text-faint" />}
      </div>
      <div className="mt-1 text-sm text-mute">{label}</div>
      {hint && <div className="mt-2 text-xs text-faint">{hint}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-line px-6 py-14 text-center">
      <p className="font-display text-sm font-semibold text-paper">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-mute">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-panel-raised", className)} />;
}

export function AccessRestricted({ resource = "this page" }: { resource?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-line bg-panel px-6 py-16 text-center">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-status-critical/10">
        <ShieldOff className="h-5 w-5 text-status-critical" />
      </div>
      <p className="font-display text-sm font-semibold text-paper">Access restricted</p>
      <p className="mt-1.5 max-w-sm text-sm text-mute">
        Your current role doesn&apos;t have permission to view {resource}. Switch roles from the top bar to see how
        access changes, or ask an organization owner to grant it.
      </p>
    </div>
  );
}
