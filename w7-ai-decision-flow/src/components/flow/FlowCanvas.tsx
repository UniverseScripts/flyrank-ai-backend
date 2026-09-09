"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Toolbar } from "@/components/flow/Toolbar";
import { RunTrace } from "@/components/flow/RunTrace";
import { RunHistory } from "@/components/flow/RunHistory";
import { ExecutionProvider } from "@/components/flow/ExecutionContext";
import { nodeTypes } from "@/components/flow/DecisionNode";
import { useFlowRun } from "@/lib/hooks/useFlowRun";
import { activeEdgeIds, failedNodeId, nodeStates } from "@/lib/flow/executionState";
import { createDecisionNode } from "@/lib/graph/factory";
import { branchOf } from "@/lib/graph/traverse";
import { fromJSON, toJSON } from "@/lib/graph/serialize";
import { validateGraph } from "@/lib/graph/validate";
import type { DecisionNode } from "@/lib/graph/types";
import { loadGraph, saveGraph, clearGraph } from "@/lib/store/graph";

const BRANCH_COLOR: Record<string, string> = { YES: "#10b981", NO: "#f43f5e" };

function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<DecisionNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [input, setInput] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const { run, history, error: runError, isBusy, start, select } = useFlowRun();

  // Hydrate from localStorage after mount. Reading during render would make the
  // server and client markup disagree.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const saved = loadGraph();
    if (saved) {
      setNodes(saved.nodes);
      setEdges(saved.edges);
    }
    setHydrated(true);
  }, [setNodes, setEdges]);

  // Persist every change, but never before hydration or the first render would
  // overwrite the saved graph with an empty one.
  useEffect(() => {
    if (hydrated) saveGraph({ nodes, edges });
  }, [hydrated, nodes, edges]);

  const nextId = useRef(1);
  useEffect(() => {
    // Resume numbering above whatever was restored, so ids stay unique.
    const highest = nodes.reduce((max, n) => Math.max(max, Number(n.id) || 0), 0);
    nextId.current = Math.max(nextId.current, highest + 1);
  }, [nodes]);

  const onAddNode = useCallback(() => {
    const id = String(nextId.current++);
    // Nodes are 256px wide; step wider than that so new ones never land on top
    // of an existing node, and wrap to a second row after four.
    const index = Number(id) - 1;
    setNodes((current) => [
      ...current,
      createDecisionNode(id, {
        x: 60 + (index % 4) * 320,
        y: 60 + Math.floor(index / 4) * 240,
      }),
    ]);
  }, [setNodes]);

  const onClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
    clearGraph();
    setImportError(null);
    nextId.current = 1;
  }, [setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const branch = connection.sourceHandle ?? "";
      setEdges((current) =>
        addEdge(
          { ...connection, label: branch, style: { stroke: BRANCH_COLOR[branch] } },
          current
        )
      );
    },
    [setEdges]
  );

  // One decision cannot have two YES branches, and a node cannot answer itself.
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      if (connection.source === connection.target) return false;
      return !edges.some(
        (e) => e.source === connection.source && branchOf(e) === connection.sourceHandle
      );
    },
    [edges]
  );

  const onExport = useCallback(() => {
    const blob = new Blob([toJSON({ nodes, edges })], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "decision-flow.json";
    link.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const onImport = useCallback(
    async (file: File) => {
      const parsed = fromJSON(await file.text());
      if (!parsed.ok) {
        setImportError(parsed.errors.join(" "));
        return;
      }
      setImportError(null);
      setNodes(parsed.graph.nodes);
      setEdges(parsed.graph.edges);
    },
    [setNodes, setEdges]
  );

  const errors = useMemo(() => {
    const result = validateGraph({ nodes, edges });
    return result.ok ? [] : result.errors;
  }, [nodes, edges]);

  const execStates = useMemo(() => nodeStates(run), [run]);
  const retryFrom = useMemo(() => failedNodeId(run), [run]);

  // Only the edges the run actually travelled animate.
  const displayEdges = useMemo(() => {
    const active = activeEdgeIds({ nodes, edges }, run);
    return edges.map((edge) =>
      active.has(edge.id)
        ? { ...edge, animated: true, style: { ...edge.style, strokeWidth: 3 } }
        : edge
    );
  }, [nodes, edges, run]);

  return (
    <div className="flex h-full flex-col" data-testid="flow-canvas">
      <Toolbar
        nodeCount={nodes.length}
        edgeCount={edges.length}
        errors={errors}
        input={input}
        isBusy={isBusy}
        onInputChange={setInput}
        onAddNode={onAddNode}
        onClear={onClear}
        onRun={() => void start({ nodes, edges }, input)}
        onExport={onExport}
        onImport={(file) => void onImport(file)}
      />

      {importError ? (
        <p className="border-b bg-destructive/10 px-4 py-1.5 text-xs text-destructive" data-testid="import-error">
          {importError}
        </p>
      ) : null}

      <div className="flex-1">
        <ExecutionProvider value={execStates}>
          <ReactFlow
            nodes={nodes}
            edges={displayEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            fitView
            // Without a cap, fitView zooms a small graph to 2x and pushes later
            // nodes off screen.
            fitViewOptions={{ maxZoom: 1, padding: 0.15 }}
            minZoom={0.2}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </ExecutionProvider>
      </div>

      <RunTrace
        run={run}
        error={runError}
        canRetry={retryFrom !== null}
        isBusy={isBusy}
        onRetry={() => void start({ nodes, edges }, input, { startNodeId: retryFrom })}
      />
      <RunHistory runs={history} activeId={run?.id ?? null} onSelect={(id) => void select(id)} />
    </div>
  );
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}
