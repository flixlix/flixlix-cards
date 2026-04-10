import { createCardConfig } from "@flixlix-cards/bundler";

export default createCardConfig({
  input: "src/energy-flow-card-plus.ts",
  outDir: "dist",
  port: 5002,
});
