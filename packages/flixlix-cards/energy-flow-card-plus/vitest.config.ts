import baseConfig from "@flixlix-cards/testing";
import { mergeConfig } from "vitest/config";

export default mergeConfig(baseConfig, {
  test: {
    name: "energy-flow-card-plus",
    // Package-specific overrides here if needed
  },
});
