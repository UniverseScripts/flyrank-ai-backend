import type { DecisionNode, FlowGraph } from "@/lib/graph/types";

/** Kept pure and id-injected so tests get deterministic graphs. */
export function createDecisionNode(
  id: string,
  position: { x: number; y: number },
  overrides: Partial<DecisionNode["data"]> = {}
): DecisionNode {
  return {
    id,
    type: "decision",
    position,
    data: { label: `Decision ${id}`, prompt: "", ...overrides },
  };
}

export const emptyGraph = (): FlowGraph => ({ nodes: [], edges: [] });
