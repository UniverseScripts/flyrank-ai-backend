import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // jsdom everywhere keeps this to one config; the unit and integration
    // suites simply never touch the DOM.
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    // Playwright owns tests/smoke; excluding it stops Vitest collecting them.
    exclude: ["**/node_modules/**", "tests/smoke/**"],
  },
});
