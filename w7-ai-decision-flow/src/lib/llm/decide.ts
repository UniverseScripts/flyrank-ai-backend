import type { Branch } from "@/lib/graph/types";

export const DECISION_SYSTEM_PROMPT =
  "You answer a yes/no question about the input. " +
  "Reply with exactly one word: YES or NO. No punctuation, no explanation.";

export function buildMessages(prompt: string, input: string) {
  const user = input.trim()
    ? `Question: ${prompt}\n\nInput: ${input}`
    : `Question: ${prompt}`;
  // User content stays in the user role; it is never concatenated into the
  // system prompt, so a hostile input cannot rewrite the instructions.
  return [
    { role: "system" as const, content: DECISION_SYSTEM_PROMPT },
    { role: "user" as const, content: user },
  ];
}

/**
 * Reduces a model reply to a branch, or null when it is not a clean answer.
 *
 * A reply containing both YES and NO is treated as no answer rather than
 * picking whichever appears first — "yes or no?" is not a decision, and
 * guessing would silently send the run down an arbitrary path.
 */
export function parseDecision(raw: string | null | undefined): Branch | null {
  if (!raw) return null;

  const tokens = raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[^a-zA-Z]+/g, " ")
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);

  const hasYes = tokens.includes("YES");
  const hasNo = tokens.includes("NO");

  // Both present, or neither: no usable answer.
  if (hasYes === hasNo) return null;
  return hasYes ? "YES" : "NO";
}
