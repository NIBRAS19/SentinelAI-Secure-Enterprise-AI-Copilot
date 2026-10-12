import { cn } from "@/lib/utils";
import type { AgentStep } from "@/lib/types";

export function Timeline({ steps }: { steps: AgentStep[] }) {
  return (
    <ol>
      {steps.map((step, i) => (
        <li key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
          {i < steps.length - 1 && <span className="absolute left-[8.5px] top-5 h-full w-px bg-line" />}
          <span
            className={cn(
              "z-10 mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full",
              step.status === "done" && "bg-status-safe/15",
              step.status === "blocked" && "bg-status-critical/15",
              step.status === "pending" && "bg-status-warn/15"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                step.status === "done" && "bg-status-safe",
                step.status === "blocked" && "bg-status-critical",
                step.status === "pending" && "bg-status-warn"
              )}
            />
          </span>
          <div className="flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-sm text-paper">{step.label}</p>
              <span className="shrink-0 font-mono text-xs text-faint">{step.time}</span>
            </div>
            {step.detail && <p className="mt-0.5 text-xs text-mute">{step.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
