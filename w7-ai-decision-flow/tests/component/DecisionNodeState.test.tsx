import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReactFlow, ReactFlowProvider, useNodesState } from "@xyflow/react";
import { nodeTypes } from "@/components/flow/DecisionNode";
import { ExecutionProvider } from "@/components/flow/ExecutionContext";
import type { NodeExecState } from "@/lib/flow/executionState";
import { createDecisionNode } from "@/lib/graph/factory";
import type { DecisionNode } from "@/lib/graph/types";

// Execution state reaches the node through context, so it can be driven
// directly here without running anything.
function Harness({ state }: { state?: NodeExecState }) {
  const initial = [createDecisionNode("1", { x: 0, y: 0 }, { label: "Triage", prompt: "q" })];
  const [nodes, , onNodesChange] = useNodesState<DecisionNode>(initial);
  const states = new Map<string, NodeExecState>(state ? [["1", state]] : []);

  return (
    <ReactFlowProvider>
      <ExecutionProvider value={states}>
        <div style={{ width: 800, height: 600 }}>
          <ReactFlow nodes={nodes} nodeTypes={nodeTypes} onNodesChange={onNodesChange} />
        </div>
      </ExecutionProvider>
    </ReactFlowProvider>
  );
}

describe("DecisionNode execution state", () => {
  it("is idle and unbadged before a run", () => {
    render(<Harness />);
    expect(screen.getByTestId("node-1")).toHaveAttribute("data-exec-state", "idle");
    expect(screen.queryByTestId("node-badge-1")).not.toBeInTheDocument();
  });

  it.each([
    ["yes", "YES"],
    ["no", "NO"],
    ["running", "running"],
    ["failed", "no answer"],
  ] as const)("shows %s state with its badge", (state, badge) => {
    render(<Harness state={state} />);
    expect(screen.getByTestId("node-1")).toHaveAttribute("data-exec-state", state);
    expect(screen.getByTestId("node-badge-1")).toHaveTextContent(badge);
  });
});
