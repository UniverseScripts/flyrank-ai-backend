import { expect, test, type Page } from "@playwright/test";

// Phase 2 gate: the editor behaviours that only exist as real browser
// interaction — dragging a connection between handles, and a graph that
// survives a reload.

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

/** React Flow builds a connection from a real mouse drag between two handles. */
async function connect(page: Page, from: string, to: string) {
  const source = page.getByTestId(from);
  const target = page.getByTestId(to);
  const a = await source.boundingBox();
  const b = await target.boundingBox();
  if (!a || !b) throw new Error(`handles not on screen: ${from} -> ${to}`);

  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  // Intermediate moves: React Flow only starts a connection once it sees the
  // pointer travel, so a single jump to the target does not register.
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

test("adds nodes from the toolbar", async ({ page }) => {
  await freshCanvas(page);
  await addNodes(page, 2);

  await expect(page.getByTestId("node-1")).toBeVisible();
  await expect(page.getByTestId("node-2")).toBeVisible();
  await expect(page.getByTestId("graph-counts")).toHaveText("2 nodes · 0 edges");
});

test("edits a node prompt", async ({ page }) => {
  await freshCanvas(page);
  await addNodes(page, 1);

  await page.getByTestId("prompt-1").fill("Is this a support request?");
  await expect(page.getByTestId("prompt-1")).toHaveValue("Is this a support request?");
});

test("connects two nodes along the YES branch", async ({ page }) => {
  await freshCanvas(page);
  await addNodes(page, 2);

  await connect(page, "handle-yes-1", "handle-target-2");

  await expect(page.getByTestId("graph-counts")).toHaveText("2 nodes · 1 edge");
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
});

test("refuses a second edge on the same branch", async ({ page }) => {
  await freshCanvas(page);
  await addNodes(page, 3);

  await connect(page, "handle-yes-1", "handle-target-2");
  await expect(page.getByTestId("graph-counts")).toHaveText("3 nodes · 1 edge");

  // One decision cannot have two YES answers.
  await connect(page, "handle-yes-1", "handle-target-3");
  await expect(page.getByTestId("graph-counts")).toHaveText("3 nodes · 1 edge");
});

test("reports why an unfinished graph is not runnable", async ({ page }) => {
  await freshCanvas(page);
  await addNodes(page, 1);

  // A node with an empty prompt blocks a run.
  await expect(page.getByTestId("graph-status")).toHaveText("1 issue");

  await page.getByTestId("prompt-1").fill("Is this billing?");
  await expect(page.getByTestId("graph-status")).toHaveText("Runnable");
});

test("keeps the graph across a reload", async ({ page }) => {
  await freshCanvas(page);
  await addNodes(page, 2);
  await page.getByTestId("prompt-1").fill("Is this billing?");
  await connect(page, "handle-yes-1", "handle-target-2");
  await expect(page.getByTestId("graph-counts")).toHaveText("2 nodes · 1 edge");

  await page.reload();

  await expect(page.getByTestId("graph-counts")).toHaveText("2 nodes · 1 edge");
  await expect(page.getByTestId("prompt-1")).toHaveValue("Is this billing?");
});
