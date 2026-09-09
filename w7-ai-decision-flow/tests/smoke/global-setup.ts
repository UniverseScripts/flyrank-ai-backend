import { request } from "@playwright/test";

/**
 * The smoke suite scripts each node's answer with a [stub:…] marker in its
 * prompt, which only works when LLM_STUB=1. Reusing a dev server someone
 * started by hand against a real provider would produce confusing failures far
 * from the cause, so check it once, loudly, up front.
 */
export default async function globalSetup() {
  const ctx = await request.newContext();
  try {
    const res = await ctx.get("http://localhost:3000/api/health");
    const body = await res.json();
    if (body.stub !== true) {
      throw new Error(
        "\n\nThe dev server on :3000 is using a real LLM provider (LLM_STUB is not 1).\n" +
          "The smoke suite scripts its branches with [stub:...] markers, which a live model ignores.\n" +
          "Stop that server and let Playwright start its own, or restart it with LLM_STUB=1.\n"
      );
    }
  } catch (err) {
    // Nothing listening yet is fine — Playwright's webServer starts it next.
    if (err instanceof Error && err.message.includes("LLM_STUB")) throw err;
  } finally {
    await ctx.dispose();
  }
}
