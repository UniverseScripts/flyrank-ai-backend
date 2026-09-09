import { eventType, staticSchema } from "inngest";
import type { FlowGraph } from "@/lib/graph/types";

// An Inngest v4 event is its own trigger and its own factory, so name and
// payload shape are declared once. staticSchema types the payload without
// pulling in a validation library; real trust boundaries validate explicitly.

export const flowPing = eventType("flow/ping", {
  schema: staticSchema<{ note?: string }>(),
});

// The graph travels with the event. It lives in the browser's localStorage,
// so the server has no copy to look up.
export const flowRunRequested = eventType("flow/run.requested", {
  schema: staticSchema<{ runId: string; input: string; graph: FlowGraph }>(),
});
