import baseConfig from "@flixlix-cards/testing";
import { mergeConfig } from "vitest/config";
import packageJson from "./package.json";
const packageName = packageJson.name;

export default mergeConfig(baseConfig, {
  test: {
    name: packageName,
  },
});
