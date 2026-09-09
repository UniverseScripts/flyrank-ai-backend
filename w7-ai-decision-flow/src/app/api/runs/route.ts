import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { flowRunRequested } from "@/lib/inngest/events";
import { validateGraph } from "@/lib/graph/validate";
import { createRun, deleteRun, listRuns } from "@/lib/store/runs";
import type { FlowGraph } from "@/lib/graph/types";

/**
 * Accepts fast and hands the walk to Inngest: the model calls take seconds per
 * node, which is far too long to hold a request open.
 */
export async function POST(request: NextRequest) {
  let body: { graph?: FlowGraph; input?: string; startNodeId?: string | null };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const graph = body.graph;
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return Response.json({ error: "Body must include a graph." }, { status: 400 });
  }

  // Bad input is rejected at the door. Only a bad moment deserves a retry, and
  // an invalid graph will never become valid by trying again.
  const validation = validateGraph(graph);
  if (!validation.ok) {
    return Response.json({ error: "Graph is not runnable.", errors: validation.errors }, { status: 400 });
  }

  const runId = randomUUID();
  const input = typeof body.input === "string" ? body.input : "";
  createRun(runId, input);

  try {
    const startNodeId =
      typeof body.startNodeId === "string" ? body.startNodeId : null;
    await inngest.send(flowRunRequested.create({ runId, input, graph, startNodeId }));
  } catch (err) {
    // The run exists in the store but nothing will ever advance it. Drop it
    // rather than leave a "pending" row the client polls forever.
    deleteRun(runId);
    return Response.json(
      {
        error:
          "Could not queue the run — is the Inngest Dev Server running? " +
          `(${(err as Error).message})`,
      },
      { status: 502 }
    );
  }

  return Response.json({ id: runId, status: "pending" }, { status: 202 });
}

/** Recent runs, newest first — the execution history the UI lists. */
export async function GET() {
  const runs = listRuns()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20)
    .map(({ id, status, input, createdAt, trace }) => ({
      id,
      status,
      input,
      createdAt,
      steps: trace.length,
    }));
  return Response.json({ runs });
}
