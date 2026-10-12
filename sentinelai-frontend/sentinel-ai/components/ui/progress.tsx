import { cn } from "@/lib/utils";

export function Progress({ value, className, tone = "gold" }: { value: number; className?: string; tone?: "gold" | "signal" | "safe" }) {
  const barTone = tone === "gold" ? "bg-gold" : tone === "signal" ? "bg-signal" : "bg-status-safe";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-panel-raised", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", barTone)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
