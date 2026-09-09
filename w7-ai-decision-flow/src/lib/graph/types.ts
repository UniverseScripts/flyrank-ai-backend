import type { Edge, Node } from "@xyflow/react";

export const BRANCHES = ["YES", "NO"] as const;
export type Branch = (typeof BRANCHES)[number];

export type DecisionNodeData = {
  label: string;
  prompt: string;
};

export type DecisionNode = Node<DecisionNodeData, "decision">;

/**
 * Which branch an edge represents is carried by `sourceHandle`, which React
 * Flow already sets from the handle the user dragged off. Storing it a second
 * time in edge data would let the two disagree.
 */
export type BranchEdge = Edge;

export type FlowGraph = {
  nodes: DecisionNode[];
  edges: BranchEdge[];
};

export const isBranch = (value: unknown): value is Branch =>
  BRANCHES.includes(value as Branch);
