import { expect, test } from "@playwright/test";

// Phase 1 gate: the two things Phase 1 promises to deliver — a running
// frontend, and an Inngest endpoint the Dev Server can actually register
// against — are true against a real server, not a mock.

test("health endpoint answers", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  // stub tells the suite whether this server is wired to a real provider.
  expect(await res.json()).toEqual({ status: "ok", stub: true });
});

test("app shell renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("flow-canvas")).toBeVisible();
});

test("inngest endpoint reports its registered functions", async ({ request }) => {
  // GET on the serve handler returns the SDK's introspection payload. It is the
  // cheapest honest proof the handler is mounted and knows its functions —
  // a PUT would try to reach a Dev Server that may not be running.
  const res = await request.get("/api/inngest");
  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(body.function_count).toBeGreaterThan(0);
  expect(body.has_signing_key).toBe(false); // dev mode
});
