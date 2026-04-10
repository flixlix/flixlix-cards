import { defineConfig } from "eslint/config";
import baseConfig from "./base.js";

/** @type {import("eslint").Linter.Config[]} */
export default defineConfig([
  ...baseConfig,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      /**
       * In utility libraries, we want to ensure exports are intentional
       * and types are strictly handled.
       */
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": [
        "warn",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      "no-console": "error", // Utils should almost never log to console
    },
  },
]);
