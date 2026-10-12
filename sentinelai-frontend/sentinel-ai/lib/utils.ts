import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SeverityLevel } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCompactNumber(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export type Tone = "safe" | "warn" | "critical" | "neutral" | "signal" | "gold";

export const toneClasses: Record<Tone, string> = {
  safe: "bg-status-safe/10 text-status-safe border-status-safe/25",
  warn: "bg-status-warn/10 text-status-warn border-status-warn/25",
  critical: "bg-status-critical/10 text-status-critical border-status-critical/25",
  neutral: "bg-white/[0.04] text-mute border-line",
  signal: "bg-signal/10 text-signal border-signal/25",
  gold: "bg-gold/10 text-gold border-gold/25",
};

export const toneDot: Record<Tone, string> = {
  safe: "bg-status-safe",
  warn: "bg-status-warn",
  critical: "bg-status-critical",
  neutral: "bg-faint",
  signal: "bg-signal",
  gold: "bg-gold",
};

export function severityTone(severity: SeverityLevel): Tone {
  switch (severity) {
    case "critical":
      return "critical";
    case "high":
      return "critical";
    case "medium":
      return "warn";
    case "low":
      return "signal";
    default:
      return "neutral";
  }
}

export function documentStatusTone(status: string): Tone {
  if (status === "READY") return "safe";
  if (status === "FAILED") return "critical";
  if (status === "ARCHIVED") return "neutral";
  return "warn"; // any in-flight processing state
}

export function securityScanTone(status: string): Tone {
  if (status === "SAFE") return "safe";
  if (status === "SUSPICIOUS") return "warn";
  return "critical"; // BLOCKED
}

export function approvalStatusTone(status: string): Tone {
  if (status === "approved") return "safe";
  if (status === "rejected") return "critical";
  return "warn"; // pending
}

export function riskTone(risk: string): Tone {
  if (risk === "low") return "safe";
  if (risk === "medium") return "warn";
  return "critical"; // high
}
