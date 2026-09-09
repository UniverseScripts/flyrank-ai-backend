import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDecisionNode } from "@/lib/graph/factory";
import { MAX_STEPS, walkFlow, type StepRunner } from "@/lib/flow/walk";
import { clearRuns, createRun, getRun } from "@/lib/store/runs";
import type { BranchEdge, FlowGraph } from "@/lib/graph/types";

// LLM_STUB makes askDecision answer from the prompt text, so the walk runs with
// no network and no credits, and each test scripts its own branch path.
vi.mock("@/lib/env", () => ({
  env: { LLM_STUB: true, LLM_API_KEY: "", LLM_BASE_URL: "", LLM_MODEL: "", INNGEST_DEV: true },
}));

const node = (id: string, prompt: string) =>
  createDecisionNode(id, { x: 0, y: 0 }, { prompt, label: `Node ${id}` });

const edge = (source: string, target: string, handle: string): BranchEdge => ({
  id: `${source}-${handle}`,
  source,
  target,
  sourceHandle: handle,
});

/** Records every step id so the test can assert Inngest would see unique ones. */
function recordingStep() {
  const ids: string[] = [];
  const step: StepRunner = {
    run: async (id, handler) => {
      ids.push(id);
      return handler();
    },
  };
  return { step, ids };
}

const walk = (graph: FlowGraph, runId = "run-1", input = "") => {
  createRun(runId, input);
  return walkFlow({ runId, input, graph }, recordingStep().step);
};

beforeEach(() => clearRuns());
afterEach(() => vi.restoreAllMocks());

describe("walkFlow traversal", () => {
  it("follows the YES branch and records execution order", async () => {
    // a(YES) -> b(NO) -> dead end
    const graph: FlowGraph = {
      nodes: [node("a", "is it a?"), node("b", "is it b? [stub:NO]")],
      edges: [edge("a", "b", "YES")],
    };

    const outcome = await walk(graph);

    expect(outcome.status).toBe("done");
    expect(outcome.trace.map((t) => t.nodeId)).toEqual(["a", "b"]);
    expect(outcome.trace.map((t) => t.decision)).toEqual(["YES", "NO"]);
    expect(outcome.trace.map((t) => t.step)).toEqual([0, 1]);
  });

  it("takes the NO branch when the model says no", async () => {
    // a says NO, so the run must land on c, never b.
    const graph: FlowGraph = {
      nodes: [node("a", "is it a? [stub:NO]"), node("b", "yes path"), node("c", "no path [stub:NO]")],
      edges: [edge("a", "b", "YES"), edge("a", "c", "NO")],
    };

    const outcome = await walk(graph);

    expect(outcome.trace.map((t) => t.nodeId)).toEqual(["a", "c"]);
  });

  it("ends when the chosen branch has nothing wired to it", async () => {
    const graph: FlowGraph = {
      nodes: [node("a", "is it a?"), node("b", "only reachable via NO")],
      edges: [edge("a", "b", "NO")],
    };

    const outcome = await walk(graph);

    expect(outcome.status).toBe("done");
    expect(outcome.trace).toHaveLength(1);
  });
});

describe("step ids", () => {
  it("stay unique when a cycle revisits the same node", async () => {
    // a is the start; b and c point at each other. A pure two-node cycle has
    // no start node and validation rejects it, so the loop has to hang off a
    // real entry point. Reusing "node-b" as the step id would make Inngest
    // replay b's first answer instead of asking again.
    const graph: FlowGraph = {
      nodes: [node("a", "enter"), node("b", "loop b"), node("c", "loop c")],
      edges: [edge("a", "b", "YES"), edge("b", "c", "YES"), edge("c", "b", "YES")],
    };
    const { step, ids } = recordingStep();
    createRun("run-cycle", "");

    await walkFlow({ runId: "run-cycle", input: "", graph }, step);

    expect(ids.length).toBeGreaterThan(2);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(0, 5)).toEqual(["node-a-0", "node-b-1", "node-c-2", "node-b-3", "node-c-4"]);
  });
});

describe("resuming a failed run", () => {
  it("starts from the given node instead of the graph root", async () => {
    // Retrying a failure must not re-ask, and re-pay for, the nodes that
    // already answered.
    const graph: FlowGraph = {
      nodes: [node("a", "root"), node("b", "middle"), node("c", "leaf [stub:NO]")],
      edges: [edge("a", "b", "YES"), edge("b", "c", "YES")],
    };
    createRun("run-resume", "");

    const outcome = await walkFlow(
      { runId: "run-resume", input: "", graph, startNodeId: "b" },
      recordingStep().step
    );

    expect(outcome.trace.map((t) => t.nodeId)).toEqual(["b", "c"]);
  });

  it("falls back to the root when the named node is gone", async () => {
    const graph: FlowGraph = {
      nodes: [node("a", "root [stub:NO]")],
      edges: [],
    };
    createRun("run-resume-missing", "");

    const outcome = await walkFlow(
      { runId: "run-resume-missing", input: "", graph, startNodeId: "deleted" },
      recordingStep().step
    );

    expect(outcome.trace.map((t) => t.nodeId)).toEqual(["a"]);
  });
});

describe("guards", () => {
  it("stops a looping graph instead of walking forever", async () => {
    const graph: FlowGraph = {
      nodes: [node("a", "enter"), node("b", "loop b"), node("c", "loop c")],
      edges: [edge("a", "b", "YES"), edge("b", "c", "YES"), edge("c", "b", "YES")],
    };

    const outcome = await walk(graph, "run-loop");

    expect(outcome.status).toBe("failed");
    expect(outcome.trace).toHaveLength(MAX_STEPS);
    expect(outcome.errors?.join()).toMatch(/the graph loops/);
  });

  it("refuses an invalid graph before asking the model anything", async () => {
    const graph: FlowGraph = { nodes: [node("a", "   ")], edges: [] };
    const { step, ids } = recordingStep();
    createRun("run-bad", "");

    const outcome = await walkFlow({ runId: "run-bad", input: "", graph }, step);

    expect(outcome.status).toBe("failed");
    expect(ids).toEqual([]); // nothing was sent to the model
  });

  it("fails the run when a node never yields a usable answer", async () => {
    const graph: FlowGraph = {
      nodes: [node("a", "unanswerable [stub:GARBAGE]")],
      edges: [],
    };

    const outcome = await walk(graph, "run-garbage");

    expect(outcome.status).toBe("failed");
    expect(outcome.trace[0].decision).toBeNull();
    expect(outcome.trace[0].attempts).toBe(2); // one repair attempt was made
    expect(outcome.errors?.join()).toMatch(/did not get a usable answer/);
  });
});

describe("provider failures", () => {
  it("lets a provider error escape so Inngest can retry it", async () => {
    // Swallowing this would turn a transient outage into a permanently
    // 'failed' run with no retry. The run is marked failed by the function's
    // onFailure handler once retries are exhausted, not here.
    const graph: FlowGraph = { nodes: [node("a", "boom [stub:ERROR]")], edges: [] };
    createRun("run-throws", "");

    await expect(
      walkFlow({ runId: "run-throws", input: "", graph }, recordingStep().step)
    ).rejects.toThrow(/stubbed provider failure/);
  });
});

describe("run store", () => {
  it("reflects the finished run", async () => {
    const graph: FlowGraph = { nodes: [node("a", "is it a?")], edges: [] };

    await walk(graph, "run-store");

    const stored = getRun("run-store");
    expect(stored?.status).toBe("done");
    expect(stored?.trace).toHaveLength(1);
    expect(stored?.currentNodeId).toBeNull();
  });

  it("does not double the trace when a retry replays the walk", async () => {
    const graph: FlowGraph = {
      nodes: [node("a", "is it a?"), node("b", "then b [stub:NO]")],
      edges: [edge("a", "b", "YES")],
    };
    createRun("run-retry", "");

    // Inngest replays the whole handler on a retry, serving memoised steps.
    await walkFlow({ runId: "run-retry", input: "", graph }, recordingStep().step);
    await walkFlow({ runId: "run-retry", input: "", graph }, recordingStep().step);

    expect(getRun("run-retry")?.trace).toHaveLength(2);
  });
});
