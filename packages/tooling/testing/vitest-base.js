import path from "node:path";
import process from "node:process";
import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: `${path.resolve(process.cwd(), "src")}/`,
      },
    ],
  },
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
    globals: false,

    environment: "node",
    alias: [
      {
        find: /^@\//,
        replacement: `${path.resolve(process.cwd(), "src")}/`,
      },
    ],
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
