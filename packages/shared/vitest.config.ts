import baseConfig from "@flixlix-cards/testing";
import { mergeConfig } from "vite-plus";
import packageJson from "./package.json";
const packageName = packageJson.name;

export default mergeConfig(baseConfig, {
  test: {
    name: packageName,
    coverage: {
      // Ratchet: raise these when coverage grows, never lower them.
      thresholds: { lines: 36, branches: 24, functions: 27, statements: 37 },
    },
  },
});
