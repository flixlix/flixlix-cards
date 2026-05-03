import { createCardConfig } from "@flixlix-cards/bundler";

export default createCardConfig({
  input: "src/energy-breakdown-card.ts",
  outDir: "dist",
  port: 5004,
});
