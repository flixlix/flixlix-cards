import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Allows you to use describe, it, expect without importing them
    globals: true,
    // Use 'jsdom' or 'happy-dom'
    environment: "jsdom",
    // Ensure Lit and other ESM-only web component packages are processed
    server: {
      deps: {
        inline: [/lit/, /@lit/, /@repo/],
      },
    },
    // Useful for debugging web components
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
