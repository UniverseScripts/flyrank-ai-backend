// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createDecisionNode } from "@/lib/graph/factory";
import { fromJSON, toJSON, GRAPH_SCHEMA_VERSION } from "@/lib/graph/serialize";
import type { FlowGraph } from "@/lib/graph/types";

const graph: FlowGraph = {
  nodes: [createDecisionNode("a", { x: 10, y: 20 }, { prompt: "Is this a support request?" })],
  edges: [{ id: "e1", source: "a", target: "a", sourceHandle: "YES" }],
};

describe("serialize round trip", () => {
  it("survives export then import unchanged", () => {
    const parsed = fromJSON(toJSON(graph));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.graph).toEqual(graph);
  });

  it("stamps the schema version", () => {
    expect(JSON.parse(toJSON(graph)).version).toBe(GRAPH_SCHEMA_VERSION);
  });
});

describe("fromJSON rejects bad input instead of throwing", () => {
  it("handles text that is not JSON", () => {
    const parsed = fromJSON("{not json");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.errors[0]).toMatch(/Not valid JSON/);
  });

  it("handles a JSON value that is not an object", () => {
    expect(fromJSON("42").ok).toBe(false);
  });

  it("refuses an unknown schema version", () => {
    const parsed = fromJSON(JSON.stringify({ version: 99, nodes: [], edges: [] }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.errors[0]).toMatch(/Unsupported schema version 99/);
  });

  it("requires nodes and edges to be arrays", () => {
    expect(fromJSON(JSON.stringify({ version: 1, nodes: {}, edges: [] })).ok).toBe(false);
    expect(fromJSON(JSON.stringify({ version: 1, nodes: [], edges: null })).ok).toBe(false);
  });

  it("names the malformed node", () => {
    const parsed = fromJSON(
      JSON.stringify({ version: 1, nodes: [{ id: "a", data: {} }], edges: [] })
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.errors.join()).toMatch(/nodes\[0\] is missing data\.prompt/);
  });
});
