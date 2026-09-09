"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FlowGraph } from "@/lib/graph/types";
import type { Run } from "@/lib/store/runs";

const POLL_MS = 600;

export type RunSummary = {
  id: string;
  status: Run["status"];
  input: string;
  createdAt: string;
  steps: number;
};

export type StartOptions = { startNodeId?: string | null };

export type UseFlowRun = {
  run: Run | null;
  history: RunSummary[];
  error: string | null;
  isBusy: boolean;
  start: (graph: FlowGraph, input: string, options?: StartOptions) => Promise<void>;
  select: (id: string) => Promise<void>;
  reset: () => void;
};

/**
 * Starts a run and polls it to completion. The POST returns immediately with an
 * id; the walk itself happens in Inngest, so the only way to see progress is to
 * ask for it.
 */
export function useFlowRun(): UseFlowRun {
  const [run, setRun] = useState<Run | null>(null);
  const [history, setHistory] = useState<RunSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  // A run left in flight when the component goes away would keep polling.
  useEffect(() => stopPolling, [stopPolling]);

  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/runs");
      if (res.ok) setHistory((await res.json()).runs ?? []);
    } catch {
      // History is a convenience; failing to load it must not break a run.
    }
  }, []);

  const poll = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/runs/${id}`);
        if (!res.ok) throw new Error(`Run lookup failed (${res.status})`);
        const next: Run = await res.json();
        setRun(next);

        if (next.status === "done" || next.status === "failed") {
          setIsBusy(false);
          void refreshHistory();
          return;
        }
        timer.current = setTimeout(() => void poll(id), POLL_MS);
      } catch (err) {
        setError((err as Error).message);
        setIsBusy(false);
      }
    },
    [refreshHistory]
  );

  const start = useCallback(
    async (graph: FlowGraph, input: string, options: StartOptions = {}) => {
      stopPolling();
      setError(null);
      setRun(null);
      setIsBusy(true);

      try {
        const res = await fetch("/api/runs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ graph, input, startNodeId: options.startNodeId ?? null }),
        });
        const body = await res.json();

        if (!res.ok) {
          setError(body.errors?.join(" ") ?? body.error ?? "Could not start the run.");
          setIsBusy(false);
          return;
        }
        await poll(body.id);
      } catch (err) {
        setError((err as Error).message);
        setIsBusy(false);
      }
    },
    [poll, stopPolling]
  );

  /** Show a finished run from history without re-running it. */
  const select = useCallback(
    async (id: string) => {
      stopPolling();
      setError(null);
      try {
        const res = await fetch(`/api/runs/${id}`);
        if (!res.ok) throw new Error(`Run lookup failed (${res.status})`);
        setRun(await res.json());
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [stopPolling]
  );

  const reset = useCallback(() => {
    stopPolling();
    setRun(null);
    setError(null);
    setIsBusy(false);
  }, [stopPolling]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  return { run, history, error, isBusy, start, select, reset };
}
