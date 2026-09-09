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
import { useFlowRun } from "@/lib/hooks/useFlowRun";
import { nodeTypes } from "@/components/flow/DecisionNode";
import { createDecisionNode } from "@/lib/graph/factory";
import { branchOf } from "@/lib/graph/traverse";
import { validateGraph } from "@/lib/graph/validate";
import type { DecisionNode } from "@/lib/graph/types";
import { loadGraph, saveGraph, clearGraph } from "@/lib/store/graph";

const BRANCH_COLOR: Record<string, string> = { YES: "#10b981", NO: "#f43f5e" };

function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<DecisionNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

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
    nextId.current = 1;
  }, [setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const branch = connection.sourceHandle ?? "";
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            label: branch,
            style: { stroke: BRANCH_COLOR[branch] },
          },
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

  const [input, setInput] = useState("");
  const { run, error: runError, isBusy, start } = useFlowRun();

  const errors = useMemo(() => {
    const result = validateGraph({ nodes, edges });
    return result.ok ? [] : result.errors;
  }, [nodes, edges]);

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
      />
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
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
      </div>
      <RunTrace run={run} error={runError} />
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
