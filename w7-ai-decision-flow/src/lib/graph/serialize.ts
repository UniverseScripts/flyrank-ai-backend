import type { BranchEdge, DecisionNode, FlowGraph } from "@/lib/graph/types";

export const GRAPH_SCHEMA_VERSION = 1;

export type SerializedGraph = {
  version: number;
  nodes: DecisionNode[];
  edges: BranchEdge[];
};

export function toJSON(graph: FlowGraph): string {
  const payload: SerializedGraph = {
    version: GRAPH_SCHEMA_VERSION,
    nodes: graph.nodes,
    edges: graph.edges,
  };
  return JSON.stringify(payload, null, 2);
}

export type ParseResult =
  | { ok: true; graph: FlowGraph }
  | { ok: false; errors: string[] };

/**
 * Parses untrusted JSON — a pasted file or a localStorage value written by an
 * older build. Shape is checked structurally rather than trusted, so a bad
 * import surfaces as an error list instead of crashing the canvas.
 */
export function fromJSON(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return { ok: false, errors: [`Not valid JSON: ${(err as Error).message}`] };
  }

  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["Expected a JSON object."] };
  }

  const { version, nodes, edges } = raw as Partial<SerializedGraph>;

  if (version !== GRAPH_SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [`Unsupported schema version ${String(version)}; expected ${GRAPH_SCHEMA_VERSION}.`],
    };
  }
  if (!Array.isArray(nodes)) return { ok: false, errors: ["`nodes` must be an array."] };
  if (!Array.isArray(edges)) return { ok: false, errors: ["`edges` must be an array."] };

  const errors: string[] = [];
  nodes.forEach((node, i) => {
    if (typeof node?.id !== "string") errors.push(`nodes[${i}] is missing a string id.`);
    if (typeof node?.data?.prompt !== "string") errors.push(`nodes[${i}] is missing data.prompt.`);
    if (typeof node?.position?.x !== "number" || typeof node?.position?.y !== "number") {
      errors.push(`nodes[${i}] is missing a numeric position.`);
    }
  });
  edges.forEach((edge, i) => {
    if (typeof edge?.id !== "string") errors.push(`edges[${i}] is missing a string id.`);
    if (typeof edge?.source !== "string") errors.push(`edges[${i}] is missing a source.`);
    if (typeof edge?.target !== "string") errors.push(`edges[${i}] is missing a target.`);
  });

  return errors.length ? { ok: false, errors } : { ok: true, graph: { nodes, edges } };
}
