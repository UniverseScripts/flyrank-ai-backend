"use client";

import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { Textarea } from "@/components/ui/textarea";
import { useNodeExecState } from "@/components/flow/ExecutionContext";
import type { NodeExecState } from "@/lib/flow/executionState";
import type { DecisionNode as DecisionNodeType } from "@/lib/graph/types";

export const DECISION_NODE_TYPE = "decision";

const STATE_STYLE: Record<NodeExecState, string> = {
  idle: "border-border",
  running: "border-amber-500 ring-2 ring-amber-500/40 animate-pulse",
  yes: "border-emerald-500 ring-2 ring-emerald-500/30",
  no: "border-rose-500 ring-2 ring-rose-500/30",
  failed: "border-destructive ring-2 ring-destructive/40",
};

const STATE_BADGE: Record<NodeExecState, string | null> = {
  idle: null,
  running: "running",
  yes: "YES",
  no: "NO",
  failed: "no answer",
};

export function DecisionNode({ id, data, selected }: NodeProps<DecisionNodeType>) {
  const { updateNodeData } = useReactFlow();
  const execState = useNodeExecState(id);
  const badge = STATE_BADGE[execState];

  return (
    <div
      data-testid={`node-${id}`}
      data-exec-state={execState}
      className={`relative w-64 rounded-lg border-2 bg-card text-card-foreground shadow-sm transition-all ${
        selected && execState === "idle" ? "border-primary" : STATE_STYLE[execState]
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3"
        data-testid={`handle-target-${id}`}
      />

      <div className="flex items-center gap-2 border-b px-3 py-2 text-xs font-medium tracking-wide uppercase">
        <span>{data.label}</span>
        {badge ? (
          <span
            className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] normal-case"
            data-testid={`node-badge-${id}`}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <div className="p-3">
        <Textarea
          // nodrag stops React Flow treating a text selection as a node drag.
          className="nodrag min-h-20 resize-none text-sm"
          placeholder="Ask a yes/no question…"
          aria-label={`Prompt for ${data.label}`}
          data-testid={`prompt-${id}`}
          value={data.prompt}
          onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
        />
      </div>

      {/* Handle ids are the branch: React Flow puts them on edge.sourceHandle,
          which is what traversal reads. */}
      <Handle
        id="YES"
        type="source"
        position={Position.Right}
        style={{ top: "40%" }}
        className="!h-3 !w-3 !bg-emerald-500"
        data-testid={`handle-yes-${id}`}
      />
      <Handle
        id="NO"
        type="source"
        position={Position.Right}
        style={{ top: "70%" }}
        className="!h-3 !w-3 !bg-rose-500"
        data-testid={`handle-no-${id}`}
      />

      <div className="pointer-events-none absolute -right-9 top-[33%] text-[10px] font-semibold text-emerald-600">
        YES
      </div>
      <div className="pointer-events-none absolute -right-8 top-[63%] text-[10px] font-semibold text-rose-600">
        NO
      </div>
    </div>
  );
}

export const nodeTypes = { [DECISION_NODE_TYPE]: DecisionNode };
