import path from "node:path";
import process from "node:process";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  test: {
    // Allows you to use describe, it, expect without importing them
    globals: true,
    // Use 'jsdom' or 'happy-dom'
    environment: "node",
    // Ensure Lit and other ESM-only web component packages are processed
    server: {
      deps: {
        inline: [/lit/, /@lit/, /@repo/],
      },
    },
    // Useful for debugging web components
    include: ["__tests__/**/*.test.ts", "src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
