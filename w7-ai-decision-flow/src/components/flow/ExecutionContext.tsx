"use client";

import { createContext, useContext } from "react";
import type { NodeExecState } from "@/lib/flow/executionState";

/**
 * Execution state reaches nodes through context rather than node.data, so it
 * never lands in the graph that gets serialised to localStorage or exported.
 */
const ExecutionContext = createContext<Map<string, NodeExecState>>(new Map());

export const ExecutionProvider = ExecutionContext.Provider;

export function useNodeExecState(nodeId: string): NodeExecState {
  return useContext(ExecutionContext).get(nodeId) ?? "idle";
}
