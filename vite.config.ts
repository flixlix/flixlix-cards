import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    plugins: ["oxc", "typescript", "unicorn", "import", "promise", "vitest"],
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      "./packages/tooling/lint-rules/plugin.js",
    ],
    categories: {
      correctness: "error",
      suspicious: "error",
      perf: "error",
    },
    env: { builtin: true, browser: true },
    ignorePatterns: [
      ".claude/**",
      "**/dist/**",
      "**/node_modules/**",
      "apps/web/src/routeTree.gen.ts",
    ],
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
      complexity: ["error", { max: 20 }],
      "flixlix/cognitive-complexity": ["error", { max: 15 }],
      "flixlix/no-index-fallback": "error",
      "flixlix/no-identity-arithmetic": "error",
      "flixlix/no-reactive-mutation": "error",
      "flixlix/no-card-type-sniffing": "error",
      "flixlix/no-camelcase-event-binding": "error",
      "flixlix/no-mwc-elements": "error",
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    overrides: [
      {
        files: ["**/*.test.ts", "**/*.test.js", "packages/shared/src/testing/**"],
        rules: {
          "typescript/no-non-null-assertion": "off",
          "typescript/no-unsafe-member-access": "off",
          "typescript/no-unsafe-assignment": "off",
          "typescript/no-unsafe-call": "off",
          "typescript/no-unsafe-type-assertion": "off",
          "vitest/require-mock-type-parameters": "off",
          "vitest/no-disabled-tests": "error",
          "vitest/no-focused-tests": "error",
          // Vitest's expect takes a failure message; scenario tables assert through expectFlowCard.
          "vitest/valid-expect": ["error", { maxArgs: 2 }],
          "vitest/expect-expect": ["error", { assertFunctionNames: ["expect", "expectFlowCard"] }],
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
        // Cards render; calculations belong in shared/card-state.
        files: ["packages/flixlix-cards/*-flow-card-plus/src/**"],
        excludeFiles: ["**/*.test.ts"],
        rules: {
          "max-lines": ["error", { max: 450, skipBlankLines: true, skipComments: true }],
          "max-lines-per-function": [
            "error",
            { max: 120, skipBlankLines: true, skipComments: true },
          ],
        },
      },
      {
        files: ["packages/shared/src/card-state/**"],
        excludeFiles: ["**/*.test.ts"],
        rules: {
          "flixlix/no-mutation": "error",
          "no-param-reassign": ["error", { props: true }],
          "max-lines-per-function": [
            "error",
            { max: 80, skipBlankLines: true, skipComments: true },
          ],
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
      ".claude",
      "**/dist",
      "**/node_modules",
      ".pnpm-store",
      "*.log",
      ".output",
      "routeTree.gen.ts",
    ],
  },
});
