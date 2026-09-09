import OpenAI from "openai";
import { RetryAfterError } from "inngest";
import { env } from "@/lib/env";
import type { Branch } from "@/lib/graph/types";
import { buildMessages, parseDecision } from "@/lib/llm/decide";

export type DecisionResult = {
  decision: Branch | null;
  raw: string;
  attempts: number;
  model: string;
  durationMs: number;
};

/** Enough room for a one-word answer plus stray whitespace, no room to ramble. */
const MAX_TOKENS = 10;
const TIMEOUT_MS = 30_000;

let client: OpenAI | null = null;
function getClient(): OpenAI {
  // One client for the process; a new one per call would drop connection reuse.
  client ??= new OpenAI({
    apiKey: env.LLM_API_KEY,
    baseURL: env.LLM_BASE_URL,
    timeout: TIMEOUT_MS,
    maxRetries: 2, // transient 429/5xx only; the SDK never retries a 4xx
  });
  return client;
}

/**
 * Test seam. With LLM_STUB=1 no network call happens at all, so every test
 * level runs deterministically and for free. A prompt may carry a marker to
 * drive a specific path.
 */
function stubReply(prompt: string): string {
  if (prompt.includes("[stub:NO]")) return "NO";
  if (prompt.includes("[stub:GARBAGE]")) return "I am not sure, could be yes or no";
  if (prompt.includes("[stub:ERROR]")) throw new Error("stubbed provider failure");
  return "YES";
}

async function complete(prompt: string, input: string, nudge?: string): Promise<string> {
  if (env.LLM_STUB) return stubReply(prompt);

  const messages = buildMessages(prompt, input);
  if (nudge) messages.push({ role: "user" as const, content: nudge });

  try {
    const res = await getClient().chat.completions.create({
      model: env.LLM_MODEL,
      temperature: 0,
      max_tokens: MAX_TOKENS,
      messages,
    });
    return res.choices[0]?.message?.content ?? "";
  } catch (err) {
    // Free-tier models rate-limit readily. Inngest's default backoff retries
    // within seconds, which just burns attempts on a closed window;
    // RetryAfterError tells it to wait until the window reopens.
    if (err instanceof OpenAI.APIError && err.status === 429) {
      throw new RetryAfterError(
        "Provider rate-limited (429) for " + env.LLM_MODEL,
        "60s",
        { cause: err }
      );
    }
    throw err;
  }
}

/**
 * One decision. An unparseable reply earns exactly one repair attempt before
 * the node is reported as undecided — retrying forever on a model that will
 * not follow the format just burns credits.
 */
export async function askDecision(prompt: string, input = ""): Promise<DecisionResult> {
  const startedAt = Date.now();

  let raw = await complete(prompt, input);
  let decision = parseDecision(raw);
  let attempts = 1;

  if (decision === null) {
    attempts = 2;
    raw = await complete(
      prompt,
      input,
      "That was not a valid answer. Reply with exactly one word: YES or NO."
    );
    decision = parseDecision(raw);
  }

  return {
    decision,
    raw,
    attempts,
    model: env.LLM_STUB ? "stub" : env.LLM_MODEL,
    durationMs: Date.now() - startedAt,
  };
}
