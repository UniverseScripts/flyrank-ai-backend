// @vitest-environment node
import { describe, expect, it } from "vitest";
import { activeEdgeIds, failedNodeId, nodeStates } from "@/lib/flow/executionState";
import { createDecisionNode } from "@/lib/graph/factory";
import type { FlowGraph } from "@/lib/graph/types";
import type { Run, TraceEntry } from "@/lib/store/runs";

const entry = (step: number, nodeId: string, decision: TraceEntry["decision"]): TraceEntry => ({
  step, nodeId, label: `Node ${nodeId}`, prompt: "q", decision, attempts: 1, durationMs: 10,
});

const run = (over: Partial<Run> = {}): Run => ({
  id: "r", status: "done", input: "", trace: [], currentNodeId: null,
  createdAt: new Date().toISOString(), ...over,
});

const graph: FlowGraph = {
  nodes: ["a", "b", "c"].map((id) => createDecisionNode(id, { x: 0, y: 0 }, { prompt: "q" })),
  edges: [
    { id: "a-yes", source: "a", target: "b", sourceHandle: "YES" },
    { id: "a-no", source: "a", target: "c", sourceHandle: "NO" },
    { id: "b-yes", source: "b", target: "c", sourceHandle: "YES" },
  ],
};

describe("nodeStates", () => {
  it("is empty with no run", () => {
    expect(nodeStates(null).size).toBe(0);
  });

  it("colours visited nodes by the answer they gave", () => {
    const states = nodeStates(run({ trace: [entry(0, "a", "YES"), entry(1, "b", "NO")] }));
    expect(states.get("a")).toBe("yes");
    expect(states.get("b")).toBe("no");
    expect(states.get("c")).toBeUndefined();
  });

  it("marks an unanswered node failed", () => {
    const states = nodeStates(run({ status: "failed", trace: [entry(0, "a", null)] }));
    expect(states.get("a")).toBe("failed");
  });

  it("shows where a running run currently is", () => {
    const states = nodeStates(
      run({ status: "running", trace: [entry(0, "a", "YES")], currentNodeId: "b" })
    );
    expect(states.get("a")).toBe("yes");
    expect(states.get("b")).toBe("running");
  });

  it("prefers 'running' over an earlier visit when a cycle comes back round", () => {
    // Otherwise a revisited node would show the answer it gave last lap while
    // the run is actually sitting on it right now.
    const states = nodeStates(
      run({ status: "running", trace: [entry(0, "a", "YES"), entry(1, "b", "YES")], currentNodeId: "a" })
    );
    expect(states.get("a")).toBe("running");
  });

  it("does not mark a current node running once the run has settled", () => {
    const states = nodeStates(run({ status: "done", trace: [entry(0, "a", "YES")], currentNodeId: "b" }));
    expect(states.get("b")).toBeUndefined();
  });
});

describe("activeEdgeIds", () => {
  it("is empty with no run", () => {
    expect(activeEdgeIds(graph, null).size).toBe(0);
  });

  it("marks only the edges the run travelled", () => {
    const active = activeEdgeIds(graph, run({ trace: [entry(0, "a", "YES"), entry(1, "b", "YES")] }));
    expect([...active].sort()).toEqual(["a-yes", "b-yes"]);
  });

  it("follows the NO branch when that is what was answered", () => {
    const active = activeEdgeIds(graph, run({ trace: [entry(0, "a", "NO")] }));
    expect([...active]).toEqual(["a-no"]);
  });

  it("ignores a step that never got an answer", () => {
    expect(activeEdgeIds(graph, run({ trace: [entry(0, "a", null)] })).size).toBe(0);
  });
});

describe("failedNodeId", () => {
  it("is null for a run that succeeded", () => {
    expect(failedNodeId(run({ trace: [entry(0, "a", "YES")] }))).toBeNull();
  });

  it("names the node that gave no answer", () => {
    const r = run({ status: "failed", trace: [entry(0, "a", "YES"), entry(1, "b", null)] });
    expect(failedNodeId(r)).toBe("b");
  });

  it("falls back to the last node reached when the failure had no trace entry", () => {
    // A provider outage fails the run via onFailure without recording a null
    // decision, so resume from wherever it got to.
    const r = run({ status: "failed", trace: [entry(0, "a", "YES")], error: "provider down" });
    expect(failedNodeId(r)).toBe("a");
  });

  it("is null when a run failed before reaching any node", () => {
    expect(failedNodeId(run({ status: "failed", trace: [] }))).toBeNull();
  });
});
