import { defineConfig } from "vitest/config";

// Convex backend functions run in an edge-style runtime, so we test them with
// convex-test under the edge-runtime environment.
export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    include: ["convex/**/*.test.ts"],
  },
});
