import baseConfig from "@energy-cards/testing";
import { mergeConfig } from "vitest/config";

export default mergeConfig(baseConfig, {
  test: {
    name: "power-flow-card",
    // Package-specific overrides here if needed
  },
});
