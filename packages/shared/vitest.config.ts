import baseConfig from "@flixlix-cards/testing";
import { mergeConfig } from "vite-plus";
import packageJson from "./package.json";
const packageName = packageJson.name;

export default mergeConfig(baseConfig, {
  test: {
    name: packageName,
  },
});
