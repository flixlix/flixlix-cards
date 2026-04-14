import { configs as litConfigs } from "eslint-plugin-lit";
import wc from "eslint-plugin-wc";
import { defineConfig } from "eslint/config";
import baseConfig from "./base.js";

/** @type {import("eslint").Linter.Config[]} */
export default defineConfig([
  ...baseConfig,
  {
    ignores: ["**/node_modules/", "**/dist/", "**/*.js"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      wc,
    },
    rules: {
      // Classes (Lit components)
      "@typescript-eslint/no-explicit-any": "off",
      "class-methods-use-this": "off",
      "lines-between-class-members": "off",

      // Console
      "no-console": ["warn", { allow: ["warn", "error", "info", "groupCollapsed", "groupEnd"] }],
    },
  },
  litConfigs["flat/recommended"],
  {
    files: ["src/logging.ts", "**/logging.ts"],
    rules: {
      "no-console": "off",
    },
  },
]);
