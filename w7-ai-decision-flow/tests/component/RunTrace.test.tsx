import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RunTrace } from "@/components/flow/RunTrace";
import type { Run, TraceEntry } from "@/lib/store/runs";

const entry = (over: Partial<TraceEntry> = {}): TraceEntry => ({
  step: 0, nodeId: "1", label: "Triage", prompt: "q",
  decision: "YES", attempts: 1, durationMs: 120, ...over,
});

const run = (over: Partial<Run> = {}): Run => ({
  id: "r", status: "done", input: "", trace: [entry()], currentNodeId: null,
  createdAt: new Date().toISOString(), ...over,
});

const props = { error: null, canRetry: false, isBusy: false, onRetry: () => {} };

describe("RunTrace", () => {
  it("renders nothing before a run exists", () => {
    const { container } = render(<RunTrace {...props} run={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a transport error instead of a trace", () => {
    render(<RunTrace {...props} run={null} error="Could not start the run." />);
    expect(screen.getByTestId("run-error")).toHaveTextContent("Could not start the run.");
  });

  it("lists each step with its decision and duration", () => {
    render(<RunTrace {...props} run={run({ trace: [entry(), entry({ step: 1, decision: "NO", durationMs: 80 })] })} />);

    expect(screen.getByTestId("run-status")).toHaveTextContent("Finished");
    expect(screen.getByTestId("run-step-count")).toHaveTextContent("2 steps");
    expect(screen.getByTestId("trace-decision-0")).toHaveTextContent("YES");
    expect(screen.getByTestId("trace-decision-1")).toHaveTextContent("NO");
    expect(screen.getByTestId("run-duration")).toHaveTextContent("0.2s");
  });

  it("flags a step that needed a repair attempt", () => {
    render(<RunTrace {...props} run={run({ trace: [entry({ attempts: 2 })] })} />);
    expect(screen.getByTestId("trace-repaired-0")).toBeInTheDocument();
  });

  it("labels an unanswered step and shows why the run failed", () => {
    render(
      <RunTrace
        {...props}
        run={run({ status: "failed", error: "Node \"Triage\" did not get a usable answer.", trace: [entry({ decision: null })] })}
      />
    );
    expect(screen.getByTestId("run-status")).toHaveTextContent("Failed");
    expect(screen.getByTestId("trace-decision-0")).toHaveTextContent("no answer");
    expect(screen.getByTestId("run-failure-reason")).toHaveTextContent("did not get a usable answer");
  });

  describe("retry", () => {
    it("is hidden when there is nothing to retry", () => {
      render(<RunTrace {...props} run={run()} />);
      expect(screen.queryByTestId("retry-run")).not.toBeInTheDocument();
    });

    it("fires when the run can be resumed", async () => {
      const onRetry = vi.fn();
      render(<RunTrace {...props} run={run({ status: "failed" })} canRetry onRetry={onRetry} />);

      await userEvent.click(screen.getByTestId("retry-run"));
      expect(onRetry).toHaveBeenCalledOnce();
    });

    it("is disabled while another run is in flight", () => {
      render(<RunTrace {...props} run={run({ status: "failed" })} canRetry isBusy />);
      expect(screen.getByTestId("retry-run")).toBeDisabled();
    });
  });
});
