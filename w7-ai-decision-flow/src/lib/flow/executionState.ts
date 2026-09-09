import type { FlowGraph } from "@/lib/graph/types";
import { branchOf } from "@/lib/graph/traverse";
import type { Run } from "@/lib/store/runs";

export type NodeExecState = "idle" | "running" | "yes" | "no" | "failed";

/**
 * Derived from the run, never stored on the node. Execution state is per-run
 * and must not end up in the graph that gets persisted to localStorage.
 */
export function nodeStates(run: Run | null): Map<string, NodeExecState> {
  const states = new Map<string, NodeExecState>();
  if (!run) return states;

  for (const entry of run.trace) {
    if (entry.decision === "YES") states.set(entry.nodeId, "yes");
    else if (entry.decision === "NO") states.set(entry.nodeId, "no");
    else states.set(entry.nodeId, "failed");
  }

  // The node the run is sitting on wins over any earlier visit, so a cycle
  // shows where the run is now rather than what it answered last time round.
  if (run.currentNodeId && (run.status === "running" || run.status === "pending")) {
    states.set(run.currentNodeId, "running");
  }
  return states;
}

/** The edges the run actually travelled, so only those animate. */
export function activeEdgeIds(graph: FlowGraph, run: Run | null): Set<string> {
  const ids = new Set<string>();
  if (!run) return ids;

  for (const entry of run.trace) {
    if (!entry.decision) continue;
    const edge = graph.edges.find(
      (e) => e.source === entry.nodeId && branchOf(e) === entry.decision
    );
    if (edge) ids.add(edge.id);
  }
  return ids;
}

/** The node a retry should resume from, or null when nothing failed. */
export function failedNodeId(run: Run | null): string | null {
  if (!run || run.status !== "failed") return null;
  const failed = run.trace.find((entry) => entry.decision === null);
  // A run can fail before any node answered (a provider outage on step 0), in
  // which case the last node it reached is the one to resume from.
  return failed?.nodeId ?? run.trace.at(-1)?.nodeId ?? null;
}
