import { defineConfig } from "eslint/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { default as baseConfig } from "./base.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const project = resolve(__dirname, "tsconfig.json");

/** @type {import("eslint").Linter.Config} */
export default defineConfig([
  ...baseConfig,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        React: "readonly",
        JSX: "readonly",
      },
    },
    settings: {
      "import/resolver": {
        typescript: {
          project,
        },
      },
    },
    ignores: [".*.js", "node_modules/", "dist/"],
  },
]);
