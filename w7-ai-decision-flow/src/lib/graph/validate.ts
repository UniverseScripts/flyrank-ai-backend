import type { FlowGraph } from "@/lib/graph/types";
import { branchOf, findStartNodeId } from "@/lib/graph/traverse";

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

/**
 * Checks the graph is runnable. Phase 3 refuses to execute a graph that fails
 * these, so a broken graph costs an error message rather than model credits.
 */
export function validateGraph(graph: FlowGraph): ValidationResult {
  const errors: string[] = [];
  const ids = new Set(graph.nodes.map((n) => n.id));

  if (graph.nodes.length === 0) {
    errors.push("Graph has no nodes.");
  }

  for (const node of graph.nodes) {
    if (!node.data.prompt.trim()) {
      errors.push(`Node "${node.data.label || node.id}" has an empty prompt.`);
    }
  }

  for (const edge of graph.edges) {
    if (!ids.has(edge.source)) errors.push(`Edge ${edge.id} starts at a missing node.`);
    if (!ids.has(edge.target)) errors.push(`Edge ${edge.id} points at a missing node.`);
    if (!branchOf(edge)) errors.push(`Edge ${edge.id} is not on a YES or NO handle.`);
  }

  // Two edges on one handle would make the next node ambiguous.
  const seen = new Set<string>();
  for (const edge of graph.edges) {
    const branch = branchOf(edge);
    if (!branch) continue;
    const key = `${edge.source}:${branch}`;
    if (seen.has(key)) errors.push(`Node ${edge.source} has more than one ${branch} branch.`);
    seen.add(key);
  }

  if (graph.nodes.length > 0 && findStartNodeId(graph) === null) {
    errors.push("Graph needs exactly one start node (a node with nothing pointing at it).");
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}
