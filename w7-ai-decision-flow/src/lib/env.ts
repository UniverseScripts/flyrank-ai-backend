// Server-only: nothing here is NEXT_PUBLIC_, so none of it reaches the browser.
// The provider is deliberately unpinned — any OpenAI-compatible endpoint works
// via LLM_BASE_URL, and LLM_STUB=1 makes every test level runnable without one.

export const env = {
  LLM_API_KEY: process.env.LLM_API_KEY ?? '',
  LLM_BASE_URL: process.env.LLM_BASE_URL ?? 'https://openrouter.ai/api/v1',
  LLM_MODEL: process.env.LLM_MODEL ?? '',

  /** Skip every network call and return scripted decisions instead. */
  LLM_STUB: process.env.LLM_STUB === '1',

  /** Talk to the local Inngest Dev Server rather than Inngest Cloud. */
  INNGEST_DEV: process.env.INNGEST_DEV !== '0',
} as const;
