import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { createDecisionNode } from "@/lib/graph/factory";
import { clearRuns, createRun, listRuns } from "@/lib/store/runs";
import type { FlowGraph } from "@/lib/graph/types";

// The route sends an event; the Dev Server is not running under test.
const send = vi.fn();
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: (...a: unknown[]) => send(...a) } }));

const { POST } = await import("@/app/api/runs/route");
const { GET } = await import("@/app/api/runs/[id]/route");

const post = (body: unknown) =>
  POST(new Request("http://test/api/runs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as NextRequest);

const validGraph: FlowGraph = {
  nodes: [createDecisionNode("a", { x: 0, y: 0 }, { prompt: "Is this billing?" })],
  edges: [],
};

beforeEach(() => {
  clearRuns();
  send.mockReset();
});

describe("POST /api/runs", () => {
  it("accepts a runnable graph with 202 and an id", async () => {
    const res = await post({ graph: validGraph, input: "charged twice" });

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.status).toBe("pending");
    expect(typeof body.id).toBe("string");
    expect(send).toHaveBeenCalledOnce();
  });

  it("rejects a body that is not JSON", async () => {
    const res = await post("{not json");
    expect(res.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects a body with no graph", async () => {
    const res = await post({ input: "hello" });
    expect(res.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects an invalid graph at the door, without queueing a job", async () => {
    // Bad input never becomes valid by retrying, so it must not reach the queue.
    const broken: FlowGraph = {
      nodes: [createDecisionNode("a", { x: 0, y: 0 }, { prompt: "  " })],
      edges: [],
    };
    const res = await post({ graph: broken });

    expect(res.status).toBe(400);
    expect((await res.json()).errors.join()).toMatch(/empty prompt/);
    expect(send).not.toHaveBeenCalled();
  });

  it("leaves no orphan run when the event cannot be queued", async () => {
    // A 'pending' run nothing will ever advance would be polled forever.
    send.mockRejectedValueOnce(new Error("connect ECONNREFUSED 127.0.0.1:8288"));
    const res = await post({ graph: validGraph });

    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/Inngest Dev Server/);
    expect(listRuns()).toHaveLength(0);
  });
});

describe("GET /api/runs/[id]", () => {
  it("returns the run", async () => {
    createRun("known", "some input");

    const res = await GET({} as NextRequest, { params: Promise.resolve({ id: "known" }) });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: "known", status: "pending", input: "some input" });
  });

  it("404s an unknown id", async () => {
    const res = await GET({} as NextRequest, { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});
