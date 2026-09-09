"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Run } from "@/lib/store/runs";

const STATUS_LABEL: Record<Run["status"], string> = {
  pending: "Queued",
  running: "Running",
  done: "Finished",
  failed: "Failed",
};

type RunTraceProps = {
  run: Run | null;
  error: string | null;
  canRetry: boolean;
  isBusy: boolean;
  onRetry: () => void;
};

export function RunTrace({ run, error, canRetry, isBusy, onRetry }: RunTraceProps) {
  if (error) {
    return (
      <div className="border-t px-4 py-2 text-xs text-destructive" data-testid="run-error">
        {error}
      </div>
    );
  }
  if (!run) return null;

  const totalMs = run.trace.reduce((sum, entry) => sum + entry.durationMs, 0);

  return (
    <div className="border-t bg-muted/30" data-testid="run-trace">
      <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium">
        <span data-testid="run-status">{STATUS_LABEL[run.status]}</span>
        <span className="text-muted-foreground" data-testid="run-step-count">
          {run.trace.length} step{run.trace.length === 1 ? "" : "s"}
        </span>
        {totalMs > 0 ? (
          <span className="text-muted-foreground" data-testid="run-duration">
            {(totalMs / 1000).toFixed(1)}s
          </span>
        ) : null}

        {canRetry ? (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-6 text-xs"
            onClick={onRetry}
            disabled={isBusy}
            data-testid="retry-run"
          >
            Retry from failed node
          </Button>
        ) : null}
      </div>

      {run.error ? (
        <p className="px-4 pb-2 text-xs text-destructive" data-testid="run-failure-reason">
          {run.error}
        </p>
      ) : null}

      <ScrollArea className="max-h-40">
        <ol className="space-y-1 px-4 pb-3">
          {run.trace.map((entry) => (
            <li
              key={`${entry.nodeId}-${entry.step}`}
              className="flex items-center gap-2 text-xs"
              data-testid={`trace-${entry.step}`}
            >
              <span className="w-4 tabular-nums text-muted-foreground">{entry.step + 1}</span>
              <span className="font-medium">{entry.label}</span>
              <Badge
                variant={entry.decision === "YES" ? "default" : "secondary"}
                data-testid={`trace-decision-${entry.step}`}
              >
                {entry.decision ?? "no answer"}
              </Badge>
              <span className="text-muted-foreground tabular-nums">{entry.durationMs}ms</span>
              {entry.attempts > 1 ? (
                <span className="text-amber-600" data-testid={`trace-repaired-${entry.step}`}>
                  repaired
                </span>
              ) : null}
              {entry.error ? (
                <span className="text-destructive">{entry.error}</span>
              ) : null}
            </li>
          ))}
        </ol>
      </ScrollArea>
    </div>
  );
}
