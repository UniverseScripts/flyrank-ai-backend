// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createDecisionNode } from "@/lib/graph/factory";
import { validateGraph } from "@/lib/graph/validate";
import type { BranchEdge, FlowGraph } from "@/lib/graph/types";

const node = (id: string, prompt = `q${id}`) =>
  createDecisionNode(id, { x: 0, y: 0 }, { prompt });

const edge = (id: string, source: string, target: string, handle: string | null): BranchEdge => ({
  id,
  source,
  target,
  sourceHandle: handle,
});

const errorsOf = (graph: FlowGraph) => {
  const result = validateGraph(graph);
  return result.ok ? [] : result.errors;
};

describe("validateGraph", () => {
  it("accepts a single wired decision", () => {
    expect(
      validateGraph({
        nodes: [node("a"), node("b")],
        edges: [edge("e1", "a", "b", "YES")],
      })
    ).toEqual({ ok: true });
  });

  it("rejects an empty graph", () => {
    expect(errorsOf({ nodes: [], edges: [] })).toContain("Graph has no nodes.");
  });

  it("rejects a node with a blank prompt", () => {
    expect(errorsOf({ nodes: [node("a", "   ")], edges: [] }).join()).toMatch(/empty prompt/);
  });

  it("rejects an edge pointing at a missing node", () => {
    const errors = errorsOf({ nodes: [node("a")], edges: [edge("e1", "a", "ghost", "YES")] });
    expect(errors.join()).toMatch(/points at a missing node/);
  });

  it("rejects an edge that is not on a YES or NO handle", () => {
    const errors = errorsOf({
      nodes: [node("a"), node("b")],
      edges: [edge("e1", "a", "b", null)],
    });
    expect(errors.join()).toMatch(/not on a YES or NO handle/);
  });

  it("rejects two edges on the same branch, which would make the next step ambiguous", () => {
    const errors = errorsOf({
      nodes: [node("a"), node("b"), node("c")],
      edges: [edge("e1", "a", "b", "YES"), edge("e2", "a", "c", "YES")],
    });
    expect(errors.join()).toMatch(/more than one YES branch/);
  });

  it("rejects a graph with no single start node", () => {
    const errors = errorsOf({ nodes: [node("a"), node("b")], edges: [] });
    expect(errors.join()).toMatch(/exactly one start node/);
  });
});
