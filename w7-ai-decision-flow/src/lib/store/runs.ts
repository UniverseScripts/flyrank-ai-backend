import type { Branch } from "@/lib/graph/types";

export type RunStatus = "pending" | "running" | "done" | "failed";

export type TraceEntry = {
  step: number;
  nodeId: string;
  label: string;
  prompt: string;
  decision: Branch | null;
  attempts: number;
  durationMs: number;
  error?: string;
};

export type Run = {
  id: string;
  status: RunStatus;
  input: string;
  trace: TraceEntry[];
  currentNodeId: string | null;
  error?: string;
  createdAt: string;
};

/**
 * Runs live in process memory, which is the same lesson as the in-memory task
 * list in earlier assignments: it is gone on restart and wrong across multiple
 * instances. Fine for the Dev Server, and the seam to swap for a real store.
 *
 * Held on globalThis because Next's dev server re-evaluates modules on hot
 * reload, which would otherwise drop every in-flight run.
 */
const store: Map<string, Run> =
  ((globalThis as { __runs?: Map<string, Run> }).__runs ??= new Map());

export function createRun(id: string, input: string): Run {
  const run: Run = {
    id,
    status: "pending",
    input,
    trace: [],
    currentNodeId: null,
    createdAt: new Date().toISOString(),
  };
  store.set(id, run);
  return run;
}

export function getRun(id: string): Run | null {
  return store.get(id) ?? null;
}

/**
 * Replaces fields rather than appending, so a retried Inngest run that rebuilds
 * the same trace from memoized steps writes the same state instead of doubling it.
 */
export function updateRun(id: string, patch: Partial<Omit<Run, "id">>): Run | null {
  const current = store.get(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  store.set(id, next);
  return next;
}

export function listRuns(): Run[] {
  return [...store.values()];
}

export function deleteRun(id: string): void {
  store.delete(id);
}

export function clearRuns(): void {
  store.clear();
}
