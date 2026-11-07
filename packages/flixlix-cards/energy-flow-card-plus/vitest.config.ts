import baseConfig from "@flixlix-cards/testing";
import path from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
import { mergeConfig } from "vite-plus";
import packageJson from "./package.json";
const packageName = packageJson.name;

export default mergeConfig(baseConfig, {
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json", "../../shared/tsconfig.json"] })],
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: `${path.resolve(process.cwd(), "../../shared/src")}/`,
      },
    ],
  },
  test: {
    name: packageName,
    coverage: {
      // Ratchet: raise these when coverage grows, never lower them.
      thresholds: { lines: 82, branches: 67, functions: 80, statements: 82 },
    },
    environment: "jsdom",
    alias: [
      {
        find: /^@\//,
        replacement: `${path.resolve(process.cwd(), "../../shared/src")}/`,
      },
    ],
    server: {
      deps: {
        inline: [/lit/, /@lit/, /@repo/, /@flixlix-cards\/shared/],
      },
    },
  },
});
