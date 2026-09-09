import { expect, test, type Page } from "@playwright/test";

// Phase 3 gate: a graph built in the browser, executed through a real Inngest
// Dev Server, branching on each decision. The model is stubbed (LLM_STUB=1), so
// the branch a node takes is scripted by a marker in its own prompt.

async function freshCanvas(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("flow-canvas")).toBeVisible();
  await page.getByTestId("clear-graph").click();
  await expect(page.getByTestId("graph-counts")).toHaveText("0 nodes · 0 edges");
}

async function addNodes(page: Page, count: number) {
  for (let i = 0; i < count; i++) await page.getByTestId("add-node").click();
  await fitAndSettle(page);
}

/**
 * Brings every node into view, then waits for the fit animation to stop.
 * Reading a handle's box mid-animation gives coordinates that are already
 * stale by the time the mouse gets there, and the drag lands on nothing.
 */
async function fitAndSettle(page: Page) {
  await page.locator(".react-flow__controls-fitview").click();
  const viewport = page.locator(".react-flow__viewport");
  let previous = "";
  for (let i = 0; i < 25; i++) {
    const transform = await viewport.evaluate((el) => getComputedStyle(el).transform);
    if (transform === previous) return;
    previous = transform;
    await page.waitForTimeout(60);
  }
}

async function connect(page: Page, from: string, to: string) {
  const a = await page.getByTestId(from).boundingBox();
  const b = await page.getByTestId(to).boundingBox();
  if (!a || !b) throw new Error(`handles not on screen: ${from} -> ${to}`);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

const finished = async (page: Page) =>
  expect(page.getByTestId("run-status")).toHaveText(/Finished|Failed/, { timeout: 45_000 });

test("runs a two-node flow and records the execution order", async ({ page }) => {
  await freshCanvas(page);
  await addNodes(page, 2);

  await page.getByTestId("prompt-1").fill("Is this a support request?");
  await page.getByTestId("prompt-2").fill("Is it urgent? [stub:NO]");
  await connect(page, "handle-yes-1", "handle-target-2");

  await page.getByTestId("run-input").fill("My invoice was charged twice.");
  await page.getByTestId("run-flow").click();
  await finished(page);

  await expect(page.getByTestId("run-status")).toHaveText("Finished");
  await expect(page.getByTestId("run-step-count")).toHaveText("2 steps");
  await expect(page.getByTestId("trace-decision-0")).toHaveText("YES");
  await expect(page.getByTestId("trace-decision-1")).toHaveText("NO");
});

test("takes the NO branch when the decision is no", async ({ page }) => {
  await freshCanvas(page);
  await addNodes(page, 3);

  // Node 1 answers NO, so the run must reach node 3 and never node 2.
  await page.getByTestId("prompt-1").fill("Is this billing? [stub:NO]");
  await page.getByTestId("prompt-2").fill("YES path, must not run");
  await page.getByTestId("prompt-3").fill("NO path [stub:NO]");
  await connect(page, "handle-yes-1", "handle-target-2");
  await connect(page, "handle-no-1", "handle-target-3");

  await page.getByTestId("run-flow").click();
  await finished(page);

  await expect(page.getByTestId("run-step-count")).toHaveText("2 steps");
  await expect(page.getByTestId("trace-1")).toContainText("Decision 3");
  await expect(page.getByTestId("run-trace")).not.toContainText("Decision 2");
});

test("fails the run when a node never gives a usable answer", async ({ page }) => {
  await freshCanvas(page);
  await addNodes(page, 1);

  await page.getByTestId("prompt-1").fill("Ambiguous [stub:GARBAGE]");
  await page.getByTestId("run-flow").click();
  await finished(page);

  await expect(page.getByTestId("run-status")).toHaveText("Failed");
  await expect(page.getByTestId("run-failure-reason")).toContainText("did not get a usable answer");
  await expect(page.getByTestId("trace-decision-0")).toHaveText("no answer");
});

test("cannot start a run while the graph has issues", async ({ page }) => {
  await freshCanvas(page);
  await addNodes(page, 1);

  // Empty prompt: the button stays disabled rather than queueing a doomed job.
  await expect(page.getByTestId("graph-status")).toHaveText("1 issue");
  await expect(page.getByTestId("run-flow")).toBeDisabled();

  await page.getByTestId("prompt-1").fill("Is this billing?");
  await expect(page.getByTestId("run-flow")).toBeEnabled();
});
