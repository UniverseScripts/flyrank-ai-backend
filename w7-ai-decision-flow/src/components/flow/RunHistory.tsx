"use client";

import { Button } from "@/components/ui/button";
import type { RunSummary } from "@/lib/hooks/useFlowRun";

const DOT: Record<string, string> = {
  done: "bg-emerald-500",
  failed: "bg-destructive",
  running: "bg-amber-500",
  pending: "bg-muted-foreground",
};

export function RunHistory({
  runs,
  activeId,
  onSelect,
}: {
  runs: RunSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (runs.length === 0) return null;

  return (
    <div className="flex items-center gap-2 border-t px-4 py-1.5" data-testid="run-history">
      <span className="text-muted-foreground text-xs">History</span>
      {runs.map((run) => (
        <Button
          key={run.id}
          size="sm"
          variant={run.id === activeId ? "secondary" : "ghost"}
          className="h-6 gap-1.5 px-2 text-xs"
          onClick={() => onSelect(run.id)}
          data-testid={`history-${run.id}`}
          title={run.input || "(no input)"}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${DOT[run.status] ?? DOT.pending}`} />
          {run.steps} step{run.steps === 1 ? "" : "s"}
        </Button>
      ))}
    </div>
  );
}
