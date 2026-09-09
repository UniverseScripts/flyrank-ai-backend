import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ReactFlow, ReactFlowProvider, useNodesState } from "@xyflow/react";
import { nodeTypes } from "@/components/flow/DecisionNode";
import { createDecisionNode } from "@/lib/graph/factory";
import type { DecisionNode } from "@/lib/graph/types";

// The node reads and writes through React Flow's store, so it has to be
// rendered inside a real canvas rather than in isolation.
function Harness({ initial }: { initial: DecisionNode[] }) {
  const [nodes, , onNodesChange] = useNodesState<DecisionNode>(initial);
  return (
    <ReactFlowProvider>
      <div style={{ width: 800, height: 600 }}>
        <ReactFlow nodes={nodes} nodeTypes={nodeTypes} onNodesChange={onNodesChange} />
      </div>
      {/* Mirrors the controlled state that React Flow writes back into. */}
      <output data-testid="state-prompt">{nodes[0]?.data.prompt}</output>
    </ReactFlowProvider>
  );
}

const oneNode = () => [
  createDecisionNode("1", { x: 0, y: 0 }, { label: "Triage", prompt: "Is this billing?" }),
];

describe("DecisionNode", () => {
  it("shows its label and current prompt", () => {
    render(<Harness initial={oneNode()} />);

    expect(screen.getByTestId("node-1")).toBeInTheDocument();
    expect(screen.getByText("Triage")).toBeInTheDocument();
    expect(screen.getByTestId("prompt-1")).toHaveValue("Is this billing?");
  });

  it("labels the prompt for screen readers", () => {
    render(<Harness initial={oneNode()} />);
    expect(screen.getByLabelText("Prompt for Triage")).toBeInTheDocument();
  });

  it("writes edits back through the React Flow store", async () => {
    render(<Harness initial={[createDecisionNode("1", { x: 0, y: 0 }, { label: "Triage" })]} />);

    const prompt = screen.getByTestId("prompt-1");
    expect(prompt).toHaveValue("");

    await userEvent.type(prompt, "Is this urgent?");

    expect(screen.getByTestId("prompt-1")).toHaveValue("Is this urgent?");

    // The edit is only real if it travelled through React Flow and back out to
    // the controlled nodes array. A component holding its own useState would
    // show the right textarea value but leave this mirror empty.
    expect(screen.getByTestId("state-prompt")).toHaveTextContent("Is this urgent?");
  });

  it("exposes one YES and one NO source handle", () => {
    render(<Harness initial={oneNode()} />);
    expect(screen.getByTestId("handle-yes-1")).toBeInTheDocument();
    expect(screen.getByTestId("handle-no-1")).toBeInTheDocument();
  });
});
