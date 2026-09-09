import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Toolbar } from "@/components/flow/Toolbar";

const props = {
  nodeCount: 1,
  edgeCount: 0,
  errors: [] as string[],
  input: "",
  isBusy: false,
  onInputChange: () => {},
  onAddNode: () => {},
  onClear: () => {},
  onRun: () => {},
};

describe("Toolbar", () => {
  it("pluralises the counts", () => {
    const { rerender } = render(<Toolbar {...props} nodeCount={1} edgeCount={1} />);
    expect(screen.getByTestId("graph-counts")).toHaveTextContent("1 node · 1 edge");

    rerender(<Toolbar {...props} nodeCount={2} edgeCount={0} />);
    expect(screen.getByTestId("graph-counts")).toHaveTextContent("2 nodes · 0 edges");
  });

  it("reports a runnable graph", () => {
    render(<Toolbar {...props} />);
    expect(screen.getByTestId("graph-status")).toHaveTextContent("Runnable");
  });

  it("reports how many issues block a run", () => {
    render(<Toolbar {...props} errors={["a", "b"]} />);
    expect(screen.getByTestId("graph-status")).toHaveTextContent("2 issues");
  });

  it("fires its callbacks", async () => {
    const onAddNode = vi.fn();
    const onClear = vi.fn();
    const onRun = vi.fn();
    render(<Toolbar {...props} onAddNode={onAddNode} onClear={onClear} onRun={onRun} />);

    await userEvent.click(screen.getByTestId("add-node"));
    await userEvent.click(screen.getByTestId("clear-graph"));
    await userEvent.click(screen.getByTestId("run-flow"));

    expect(onAddNode).toHaveBeenCalledOnce();
    expect(onClear).toHaveBeenCalledOnce();
    expect(onRun).toHaveBeenCalledOnce();
  });

  it("reports the run input as it is typed", async () => {
    const onInputChange = vi.fn();
    render(<Toolbar {...props} onInputChange={onInputChange} />);

    await userEvent.type(screen.getByTestId("run-input"), "hi");
    expect(onInputChange).toHaveBeenCalledTimes(2);
  });

  describe("the Run button", () => {
    it("is disabled while a run is in flight", () => {
      render(<Toolbar {...props} isBusy />);
      expect(screen.getByTestId("run-flow")).toBeDisabled();
      expect(screen.getByTestId("run-flow")).toHaveTextContent("Running…");
    });

    it("is disabled while the graph has issues, so a broken run cannot be started", () => {
      render(<Toolbar {...props} errors={["empty prompt"]} />);
      expect(screen.getByTestId("run-flow")).toBeDisabled();
    });

    it("is disabled on an empty canvas", () => {
      render(<Toolbar {...props} nodeCount={0} />);
      expect(screen.getByTestId("run-flow")).toBeDisabled();
    });

    it("is enabled once the graph is runnable", () => {
      render(<Toolbar {...props} />);
      expect(screen.getByTestId("run-flow")).toBeEnabled();
    });
  });
});
