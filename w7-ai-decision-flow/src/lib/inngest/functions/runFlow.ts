import { inngest } from "@/lib/inngest/client";
import { flowRunRequested } from "@/lib/inngest/events";
import { walkFlow } from "@/lib/flow/walk";
import { updateRun } from "@/lib/store/runs";

// Thin adapter: Inngest supplies the durable step runner, walkFlow does the work.
export const runFlow = inngest.createFunction(
  {
    id: "run-flow",
    triggers: [flowRunRequested],
    retries: 2,
    /**
     * A provider error thrown inside a step escapes the walk, so walkFlow never
     * gets to mark the run failed. Without this the run would sit at "running"
     * and the UI would poll it forever.
     */
    onFailure: async ({ event, error }) => {
      const runId = event.data.event.data.runId as string | undefined;
      if (runId) {
        updateRun(runId, {
          status: "failed",
          currentNodeId: null,
          error: error.message || "The run failed after all retries.",
        });
      }
    },
  },
  async ({ event, step }) => walkFlow(event.data, step)
);
