import type { FlowGraph } from "@/lib/graph/types";
import { fromJSON, toJSON } from "@/lib/graph/serialize";

export const STORAGE_KEY = "ai-decision-flow:graph:v1";

/**
 * Every access is guarded: localStorage is absent during SSR, throws outright
 * in some privacy modes, and may hold a graph written by an older schema.
 * A failure here loses the saved graph, it never takes the canvas down.
 */
export function loadGraph(): FlowGraph | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = fromJSON(raw);
    return parsed.ok ? parsed.graph : null;
  } catch {
    return null;
  }
}

export function saveGraph(graph: FlowGraph): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, toJSON(graph));
  } catch {
    // Quota exceeded or storage blocked — the in-memory graph is still fine.
  }
}

export function clearGraph(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do; the next save will overwrite anyway.
  }
}
