import { mergeConfig } from "vitest/config";
import baseConfig from "@energy-cards/testing";

export default mergeConfig(baseConfig, {
  test: {
    name: "power-flow-card",
    // Package-specific overrides here if needed
  },
});
