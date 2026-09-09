import { inngest } from "@/lib/inngest/client";
import { flowPing } from "@/lib/inngest/events";

// Phase 1 proof-of-wiring: one durable step, so the Dev Server dashboard shows
// a real run with a step rather than a bare function registration.
export const ping = inngest.createFunction(
  { id: "ping", triggers: [flowPing] },
  async ({ event, step }) => {
    const echoed = await step.run("echo", async () => event.data.note ?? "pong");
    return { ok: true, echoed };
  }
);
