import { createCardConfig } from "@flixlix-cards/bundler";

export default createCardConfig({
  input: "src/energy-period-selector-plus.ts",
  outDir: "dist",
  port: 5004,
});
