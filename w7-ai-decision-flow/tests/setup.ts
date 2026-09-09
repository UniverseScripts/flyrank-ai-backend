import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// Vitest runs with globals disabled, so RTL's automatic cleanup never
// registers itself. Without this, renders leak between tests.
afterEach(cleanup);

// Unit tests run in the node environment, where none of the DOM globals below
// exist. Everything past this point is only meaningful under jsdom.
if (typeof globalThis.HTMLElement !== "undefined") {
  // React Flow measures the DOM to lay out nodes and edges. jsdom implements
  // none of that, so without these stubs every canvas render throws.
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

  globalThis.DOMMatrixReadOnly = class {
    m22 = 1;
  } as unknown as typeof DOMMatrixReadOnly;

  Object.defineProperties(globalThis.HTMLElement.prototype, {
    offsetHeight: { get() { return Number.parseFloat(this.style.height) || 1; } },
    offsetWidth: { get() { return Number.parseFloat(this.style.width) || 1; } },
  });

  // ScrollArea polls getAnimations() on a timer; jsdom has no Web Animations.
  (globalThis.Element.prototype as unknown as { getAnimations: () => Animation[] }).getAnimations =
    () => [];

  (globalThis.SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () =>
    ({ x: 0, y: 0, width: 0, height: 0 }) as DOMRect;
}
