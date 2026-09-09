// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createDecisionNode } from "@/lib/graph/factory";
import {
  branchOf,
  findStartNodeId,
  nextNodeId,
  outgoingBranches,
} from "@/lib/graph/traverse";
import type { BranchEdge, FlowGraph } from "@/lib/graph/types";

const node = (id: string) => createDecisionNode(id, { x: 0, y: 0 }, { prompt: `q${id}` });

const edge = (id: string, source: string, target: string, handle: string | null): BranchEdge => ({
  id,
  source,
  target,
  sourceHandle: handle,
});

// a --YES--> b
// a --NO---> c
const graph: FlowGraph = {
  nodes: [node("a"), node("b"), node("c")],
  edges: [edge("e1", "a", "b", "YES"), edge("e2", "a", "c", "NO")],
};

describe("branchOf", () => {
  it("reads the branch from the source handle", () => {
    expect(branchOf(edge("e", "a", "b", "YES"))).toBe("YES");
    expect(branchOf(edge("e", "a", "b", "NO"))).toBe("NO");
  });

  it("rejects handles that are not a branch", () => {
    expect(branchOf(edge("e", "a", "b", "MAYBE"))).toBeNull();
    expect(branchOf(edge("e", "a", "b", null))).toBeNull();
  });
});

describe("findStartNodeId", () => {
  it("finds the one node nothing points at", () => {
    expect(findStartNodeId(graph)).toBe("a");
  });

  it("returns null when two nodes could both be the start", () => {
    expect(findStartNodeId({ nodes: [node("a"), node("b")], edges: [] })).toBeNull();
  });

  it("returns null when a cycle leaves no root", () => {
    const cyclic: FlowGraph = {
      nodes: [node("a"), node("b")],
      edges: [edge("e1", "a", "b", "YES"), edge("e2", "b", "a", "YES")],
    };
    expect(findStartNodeId(cyclic)).toBeNull();
  });

  it("returns null for an empty graph", () => {
    expect(findStartNodeId({ nodes: [], edges: [] })).toBeNull();
  });
});

describe("nextNodeId", () => {
  it("follows the branch that was asked for", () => {
    expect(nextNodeId(graph, "a", "YES")).toBe("b");
    expect(nextNodeId(graph, "a", "NO")).toBe("c");
  });

  it("returns null on a dead-end branch", () => {
    expect(nextNodeId(graph, "b", "YES")).toBeNull();
  });

  it("treats an edge pointing at a deleted node as a dead end", () => {
    const dangling: FlowGraph = {
      nodes: [node("a")],
      edges: [edge("e1", "a", "gone", "YES")],
    };
    expect(nextNodeId(dangling, "a", "YES")).toBeNull();
  });
});

describe("outgoingBranches", () => {
  it("lists the branches a node actually has wired", () => {
    expect(outgoingBranches(graph, "a").sort()).toEqual(["NO", "YES"]);
    expect(outgoingBranches(graph, "b")).toEqual([]);
  });
});
