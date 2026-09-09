"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type ToolbarProps = {
  nodeCount: number;
  edgeCount: number;
  errors: string[];
  input: string;
  isBusy: boolean;
  onInputChange: (value: string) => void;
  onAddNode: () => void;
  onClear: () => void;
  onRun: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
};

export function Toolbar({
  nodeCount,
  edgeCount,
  errors,
  input,
  isBusy,
  onInputChange,
  onAddNode,
  onClear,
  onRun,
  onExport,
  onImport,
}: ToolbarProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const runnable = errors.length === 0 && nodeCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2">
      <Button size="sm" onClick={onAddNode} data-testid="add-node">
        Add node
      </Button>
      <Button size="sm" variant="outline" onClick={onClear} data-testid="clear-graph">
        Clear
      </Button>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Button size="sm" variant="outline" onClick={onExport} data-testid="export-graph">
        Export
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => fileInput.current?.click()}
        data-testid="import-graph"
      >
        Import
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Import workflow JSON"
        data-testid="import-file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImport(file);
          // Reset so choosing the same file twice fires change again.
          e.target.value = "";
        }}
      />

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Input
        className="h-7 w-56 text-sm"
        placeholder="Message to run through the flow…"
        aria-label="Run input"
        data-testid="run-input"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
      />
      <Button size="sm" onClick={onRun} disabled={!runnable || isBusy} data-testid="run-flow">
        {isBusy ? "Running…" : "Run"}
      </Button>

      <span className="text-muted-foreground text-xs" data-testid="graph-counts">
        {nodeCount} node{nodeCount === 1 ? "" : "s"} · {edgeCount} edge
        {edgeCount === 1 ? "" : "s"}
      </span>

      <span
        className={`ml-auto text-xs ${errors.length ? "text-destructive" : "text-emerald-600"}`}
        data-testid="graph-status"
        title={errors.join(" ")}
      >
        {errors.length ? `${errors.length} issue${errors.length === 1 ? "" : "s"}` : "Runnable"}
      </span>
    </div>
  );
}
