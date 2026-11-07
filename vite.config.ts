import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    plugins: ["oxc", "typescript", "unicorn", "import", "promise", "vitest"],
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      "./packages/tooling/lint-rules/index.js",
    ],
    categories: {
      correctness: "error",
      suspicious: "error",
      perf: "error",
    },
    env: { builtin: true, browser: true },
    ignorePatterns: ["**/dist/**", "**/node_modules/**", "apps/web/src/routeTree.gen.ts"],
    options: {
      typeAware: true,
      typeCheck: true,
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      // Types
      "typescript/no-explicit-any": "error",
      "typescript/no-non-null-assertion": "error",
      "typescript/ban-ts-comment": "error",
      "typescript/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "typescript/no-unsafe-assignment": "error",
      "typescript/no-unsafe-member-access": "error",
      "typescript/no-unsafe-call": "error",
      "typescript/no-unsafe-return": "error",
      "typescript/no-unsafe-argument": "error",
      "typescript/no-unnecessary-type-assertion": "error",
      "typescript/switch-exhaustiveness-check": "error",
      "typescript/prefer-nullish-coalescing": "error",
      "typescript/restrict-plus-operands": "error",
      "typescript/restrict-template-expressions": "error",
      // Promises
      "typescript/no-floating-promises": "error",
      "typescript/no-misused-promises": "error",
      "typescript/await-thenable": "error",
      // Errors: never swallow
      "no-empty": "error",
      "typescript/only-throw-error": "error",
      "preserve-caught-error": "error",
      // Clarity
      eqeqeq: "error",
      curly: "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-var": "error",
      "prefer-const": "error",
      "no-unused-vars": "error",
      "no-unused-expressions": "error",
      "no-useless-assignment": "error",
      "import/no-cycle": "error",
      "import/no-duplicates": "error",
      "unicorn/filename-case": ["error", { case: "kebabCase" }],
      "no-underscore-dangle": "off",
      // Repo-specific guards for bugs that already shipped once
      "flixlix/no-index-fallback": "error",
      "flixlix/no-identity-arithmetic": "error",
      "flixlix/no-reactive-mutation": "error",
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    overrides: [
      {
        files: ["**/__tests__/**", "**/*.test.ts"],
        rules: {
          "typescript/no-non-null-assertion": "off",
          "typescript/no-unsafe-member-access": "off",
          "typescript/no-unsafe-assignment": "off",
          "typescript/no-unsafe-call": "off",
          "typescript/no-unsafe-type-assertion": "off",
          "vitest/require-mock-type-parameters": "off",
          "vitest/no-disabled-tests": "error",
          "vitest/no-focused-tests": "error",
        },
      },
      {
        files: ["apps/web/**", "packages/ui/**"],
        plugins: ["react", "jsx-a11y"],
        rules: { "unicorn/filename-case": "off", "react/react-in-jsx-scope": "off" },
      },
      {
        files: ["**/*.js", "**/*.mjs"],
        rules: {
          "typescript/no-unsafe-member-access": "off",
          "typescript/no-unsafe-assignment": "off",
          "typescript/no-unsafe-call": "off",
          "typescript/no-unsafe-argument": "off",
          "typescript/no-unsafe-return": "off",
        },
      },
      {
        files: ["packages/shared/src/utils/logging.ts"],
        rules: { "no-console": "off" },
      },
    ],
  },
  fmt: {
    semi: true,
    singleQuote: false,
    printWidth: 100,
    tabWidth: 2,
    trailingComma: "es5",
    arrowParens: "always",
    sortPackageJson: false,
    ignorePatterns: [
      "**/dist",
      "**/node_modules",
      ".pnpm-store",
      ".turbo",
      "*.log",
      ".output",
      "routeTree.gen.ts",
    ],
  },
});
