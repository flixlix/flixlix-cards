import { createCardConfig } from "@energy-cards/bundler";

export default createCardConfig({
  input: "src/power-flow-card-plus.ts",
  outDir: "dist",
});
