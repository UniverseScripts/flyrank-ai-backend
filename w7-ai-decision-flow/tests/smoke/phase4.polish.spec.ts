import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// Phase 4 gate: the polish features, exercised the way a user meets them —
// canvas state after a real run, an export/import round trip through the file
// picker, retry from a failure, and the run history.

async function freshCanvas(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("flow-canvas")).toBeVisible();
  await page.getByTestId("clear-graph").click();
  await expect(page.getByTestId("graph-counts")).toHaveText("0 nodes · 0 edges");
}

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

async function addNodes(page: Page, count: number) {
  for (let i = 0; i < count; i++) await page.getByTestId("add-node").click();
  await fitAndSettle(page);
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

const settled = (page: Page) =>
  expect(page.getByTestId("run-status")).toHaveText(/Finished|Failed/, { timeout: 45_000 });

test("paints the taken path onto the canvas and animates only those edges", async ({ page }) => {
  await freshCanvas(page);
  await addNodes(page, 3);

  // Node 1 answers NO, so node 2 must stay untouched.
  await page.getByTestId("prompt-1").fill("Is this billing? [stub:NO]");
  await page.getByTestId("prompt-2").fill("YES path, must not run");
  await page.getByTestId("prompt-3").fill("NO path [stub:NO]");
  await connect(page, "handle-yes-1", "handle-target-2");
  await connect(page, "handle-no-1", "handle-target-3");

  await page.getByTestId("run-flow").click();
  await settled(page);

  await expect(page.getByTestId("node-1")).toHaveAttribute("data-exec-state", "no");
  await expect(page.getByTestId("node-3")).toHaveAttribute("data-exec-state", "no");
  await expect(page.getByTestId("node-2")).toHaveAttribute("data-exec-state", "idle");
  await expect(page.getByTestId("node-badge-1")).toHaveText("NO");

  // Exactly one edge was travelled, so exactly one animates.
  await expect(page.locator(".react-flow__edge.animated")).toHaveCount(1);
});

test("exports the graph and imports it back", async ({ page }) => {
  await freshCanvas(page);
  await addNodes(page, 2);
  await page.getByTestId("prompt-1").fill("Is this billing?");
  await page.getByTestId("prompt-2").fill("Is it urgent?");
  await connect(page, "handle-yes-1", "handle-target-2");

  const download = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-graph").click(),
  ]).then(([d]) => d);

  const saved = await download.path();
  expect(download.suggestedFilename()).toBe("decision-flow.json");
  const exported = JSON.parse(readFileSync(saved, "utf8"));
  expect(exported.version).toBe(1);
  expect(exported.nodes).toHaveLength(2);

  // Wipe, then bring it back from the file.
  await page.getByTestId("clear-graph").click();
  await expect(page.getByTestId("graph-counts")).toHaveText("0 nodes · 0 edges");

  await page.getByTestId("import-file").setInputFiles(saved);
  await expect(page.getByTestId("graph-counts")).toHaveText("2 nodes · 1 edge");
  await expect(page.getByTestId("prompt-1")).toHaveValue("Is this billing?");
});

test("reports a bad import instead of wrecking the canvas", async ({ page }) => {
  await freshCanvas(page);
  await addNodes(page, 1);
  await page.getByTestId("prompt-1").fill("Is this billing?");

  await page.getByTestId("import-file").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version": 99, "nodes": [], "edges": []}'),
  });

  await expect(page.getByTestId("import-error")).toContainText("Unsupported schema version 99");
  // The graph on screen is untouched.
  await expect(page.getByTestId("graph-counts")).toHaveText("1 node · 0 edges");
});

test("retries a failed run from the node that failed", async ({ page }) => {
  await freshCanvas(page);
  await addNodes(page, 2);
  await page.getByTestId("prompt-1").fill("Is this billing?");
  await page.getByTestId("prompt-2").fill("Ambiguous [stub:GARBAGE]");
  await connect(page, "handle-yes-1", "handle-target-2");

  await page.getByTestId("run-flow").click();
  await settled(page);
  await expect(page.getByTestId("run-status")).toHaveText("Failed");
  await expect(page.getByTestId("run-step-count")).toHaveText("2 steps");

  // Resuming starts at node 2, so the retry records one step, not two.
  await expect(page.getByTestId("retry-run")).toBeVisible();
  await page.getByTestId("retry-run").click();
  await settled(page);
  await expect(page.getByTestId("run-step-count")).toHaveText("1 step");
});

test("keeps a history of runs and can reopen one", async ({ page }) => {
  await freshCanvas(page);
  await addNodes(page, 1);
  await page.getByTestId("prompt-1").fill("Is this billing?");

  await page.getByTestId("run-flow").click();
  await settled(page);
  await expect(page.getByTestId("run-history")).toBeVisible();

  const entries = page.locator('[data-testid^="history-"]');
  await expect(entries.first()).toBeVisible();

  // Reopening a past run restores its trace without re-running it.
  await entries.first().click();
  await expect(page.getByTestId("run-status")).toHaveText("Finished");
  await expect(page.getByTestId("trace-decision-0")).toHaveText("YES");
});
