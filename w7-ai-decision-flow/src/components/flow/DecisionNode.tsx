"use client";

import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { Textarea } from "@/components/ui/textarea";
import type { DecisionNode as DecisionNodeType } from "@/lib/graph/types";

export const DECISION_NODE_TYPE = "decision";

export function DecisionNode({ id, data, selected }: NodeProps<DecisionNodeType>) {
  const { updateNodeData } = useReactFlow();

  return (
    <div
      data-testid={`node-${id}`}
      className={`relative w-64 rounded-lg border bg-card text-card-foreground shadow-sm transition-colors ${
        selected ? "border-primary" : "border-border"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3"
        data-testid={`handle-target-${id}`}
      />

      <div className="border-b px-3 py-2 text-xs font-medium tracking-wide uppercase">
        {data.label}
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
