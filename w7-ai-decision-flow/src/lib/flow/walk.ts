import { findStartNodeId, nextNodeId, nodeById } from "@/lib/graph/traverse";
import { validateGraph } from "@/lib/graph/validate";
import type { Branch, FlowGraph } from "@/lib/graph/types";
import { askDecision } from "@/lib/llm/provider";
import { updateRun, type TraceEntry } from "@/lib/store/runs";

/** A cyclic graph would otherwise walk forever, one paid model call per lap. */
export const MAX_STEPS = 25;

/** What one node's step hands back. Must stay JSON-serialisable: Inngest
 *  persists step results and replays them on a retry. */
export type DecisionStepResult = {
  decision: Branch | null;
  attempts: number;
  durationMs: number;
};

/** The slice of Inngest's step tooling the walk needs, so it can be faked in tests. */
export type StepRunner = {
  run: (
    id: string,
    handler: () => Promise<DecisionStepResult>
  ) => Promise<DecisionStepResult>;
};

export type WalkInput = {
  runId: string;
  input: string;
  graph: FlowGraph;
  /** Resume from this node instead of the graph start, for retrying a failure. */
  startNodeId?: string | null;
};
export type WalkOutcome = {
  runId: string;
  status: "done" | "failed";
  trace: TraceEntry[];
  errors?: string[];
};

/**
 * Walks the graph one decision at a time, asking the model at each node and
 * following the branch it picked.
 *
 * Kept separate from the Inngest function so it can be driven by a fake step
 * runner: the traversal is the part worth testing, and Inngest's own retry and
 * memoisation machinery is not ours to re-verify.
 */
export async function walkFlow(
  { runId, input, graph, startNodeId }: WalkInput,
  step: StepRunner
): Promise<WalkOutcome> {
  const validation = validateGraph(graph);
  if (!validation.ok) {
    updateRun(runId, { status: "failed", error: validation.errors.join(" ") });
    return { runId, status: "failed", trace: [], errors: validation.errors };
  }

  const trace: TraceEntry[] = [];
  // A retry resumes at the node that failed; a fresh run starts at the root.
  let currentId =
    startNodeId && nodeById(graph, startNodeId) ? startNodeId : findStartNodeId(graph);
  let stepIndex = 0;

  updateRun(runId, { status: "running", currentNodeId: currentId });

  while (currentId && stepIndex < MAX_STEPS) {
    const node = nodeById(graph, currentId);
    if (!node) break;

    const nodeId = currentId;
    // The visit index is part of the step id. Without it a cycle revisiting a
    // node would reuse an id, and Inngest would replay the memoised answer
    // from the first visit instead of asking again.
    const result = await step.run(`node-${nodeId}-${stepIndex}`, async () => {
      const decision = await askDecision(node.data.prompt, input);
      return {
        decision: decision.decision,
        attempts: decision.attempts,
        durationMs: decision.durationMs,
      };
    });

    trace.push({
      step: stepIndex,
      nodeId,
      label: node.data.label,
      prompt: node.data.prompt,
      decision: result.decision,
      attempts: result.attempts,
      durationMs: result.durationMs,
      ...(result.decision === null
        ? { error: "Model did not return a usable YES or NO." }
        : {}),
    });

    if (result.decision === null) {
      const error = `Node "${node.data.label}" did not get a usable answer.`;
      updateRun(runId, { status: "failed", trace, currentNodeId: null, error });
      return { runId, status: "failed", trace, errors: [error] };
    }

    currentId = nextNodeId(graph, nodeId, result.decision);
    stepIndex += 1;
    updateRun(runId, { status: "running", trace, currentNodeId: currentId });
  }

  if (currentId) {
    const error = `Stopped after ${MAX_STEPS} steps — the graph loops.`;
    updateRun(runId, { status: "failed", trace, currentNodeId: null, error });
    return { runId, status: "failed", trace, errors: [error] };
  }

  // currentId is null: the last decision led to a branch with nothing wired to
  // it, which is where a flow ends.
  updateRun(runId, { status: "done", trace, currentNodeId: null });
  return { runId, status: "done", trace };
}
