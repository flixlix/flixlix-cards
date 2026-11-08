import baseConfig from "@flixlix-cards/testing";
import { mergeConfig } from "vite-plus";
import packageJson from "./package.json";
const packageName = packageJson.name;

export default mergeConfig(baseConfig, {
  test: {
    name: packageName,
    coverage: {
      // Ratchet: raise these when coverage grows, never lower them.
      thresholds: { lines: 53, branches: 47, functions: 43, statements: 54 },
    },
  },
});
