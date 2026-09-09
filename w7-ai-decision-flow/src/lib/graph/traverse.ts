import type { Branch, BranchEdge, DecisionNode, FlowGraph } from "@/lib/graph/types";
import { isBranch } from "@/lib/graph/types";

/** The branch an edge leaves its source on, or null if it is not a branch edge. */
export function branchOf(edge: BranchEdge): Branch | null {
  return isBranch(edge.sourceHandle) ? edge.sourceHandle : null;
}

export function nodeById(graph: FlowGraph, id: string): DecisionNode | null {
  return graph.nodes.find((n) => n.id === id) ?? null;
}

/** The single node nothing points at — where a run begins. */
export function findStartNodeId(graph: FlowGraph): string | null {
  const targets = new Set(graph.edges.map((e) => e.target));
  const roots = graph.nodes.filter((n) => !targets.has(n.id));
  return roots.length === 1 ? roots[0].id : null;
}

/** Where a decision sends the run next, or null when the branch is a dead end. */
export function nextNodeId(
  graph: FlowGraph,
  fromNodeId: string,
  branch: Branch
): string | null {
  const edge = graph.edges.find(
    (e) => e.source === fromNodeId && branchOf(e) === branch
  );
  if (!edge) return null;
  // An edge pointing at a deleted node is a dead end, not a crash.
  return nodeById(graph, edge.target) ? edge.target : null;
}

export function outgoingBranches(graph: FlowGraph, nodeId: string): Branch[] {
  return graph.edges
    .filter((e) => e.source === nodeId)
    .map(branchOf)
    .filter((b): b is Branch => b !== null);
}
