import baseConfig from "@flixlix-cards/testing";
import path from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
import { mergeConfig } from "vitest/config";
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
