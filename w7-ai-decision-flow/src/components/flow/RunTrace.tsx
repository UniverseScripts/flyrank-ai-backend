"use client";

import { Badge } from "@/components/ui/badge";
import type { Run } from "@/lib/store/runs";

const STATUS_LABEL: Record<Run["status"], string> = {
  pending: "Queued",
  running: "Running",
  done: "Finished",
  failed: "Failed",
};

export function RunTrace({ run, error }: { run: Run | null; error: string | null }) {
  if (error) {
    return (
      <div className="border-t px-4 py-2 text-xs text-destructive" data-testid="run-error">
        {error}
      </div>
    );
  }
  if (!run) return null;

  return (
    <div className="max-h-44 overflow-y-auto border-t bg-muted/30 px-4 py-2" data-testid="run-trace">
      <div className="flex items-center gap-2 pb-1 text-xs font-medium">
        <span data-testid="run-status">{STATUS_LABEL[run.status]}</span>
        <span className="text-muted-foreground" data-testid="run-step-count">
          {run.trace.length} step{run.trace.length === 1 ? "" : "s"}
        </span>
      </div>

      {run.error ? (
        <p className="pb-1 text-xs text-destructive" data-testid="run-failure-reason">
          {run.error}
        </p>
      ) : null}

      <ol className="space-y-1">
        {run.trace.map((entry) => (
          <li
            key={`${entry.nodeId}-${entry.step}`}
            className="flex items-center gap-2 text-xs"
            data-testid={`trace-${entry.step}`}
          >
            <span className="text-muted-foreground w-4 tabular-nums">{entry.step + 1}</span>
            <span className="font-medium">{entry.label}</span>
            <Badge
              variant={entry.decision === "YES" ? "default" : "secondary"}
              data-testid={`trace-decision-${entry.step}`}
            >
              {entry.decision ?? "no answer"}
            </Badge>
            {entry.attempts > 1 ? (
              <span className="text-muted-foreground">repaired</span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
