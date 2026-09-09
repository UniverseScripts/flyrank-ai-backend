import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDecisionNode } from "@/lib/graph/factory";
import { clearGraph, loadGraph, saveGraph, STORAGE_KEY } from "@/lib/store/graph";
import type { FlowGraph } from "@/lib/graph/types";

const graph: FlowGraph = {
  nodes: [createDecisionNode("1", { x: 5, y: 5 }, { prompt: "Is this billing?" })],
  edges: [{ id: "e1", source: "1", target: "1", sourceHandle: "NO" }],
};

beforeEach(() => window.localStorage.clear());

describe("graph persistence", () => {
  it("round-trips a graph through localStorage", () => {
    saveGraph(graph);
    expect(loadGraph()).toEqual(graph);
  });

  it("returns null when nothing is stored", () => {
    expect(loadGraph()).toBeNull();
  });

  it("clears the stored graph", () => {
    saveGraph(graph);
    clearGraph();
    expect(loadGraph()).toBeNull();
  });

  it("discards a corrupt stored value rather than throwing", () => {
    window.localStorage.setItem(STORAGE_KEY, "{ not json");
    expect(loadGraph()).toBeNull();
  });

  it("discards a graph written by an older schema", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 0, nodes: [], edges: [] }));
    expect(loadGraph()).toBeNull();
  });

  it("survives storage being unavailable", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => { throw new Error("QuotaExceededError"); });

    expect(() => saveGraph(graph)).not.toThrow();
    setItem.mockRestore();
  });
});
