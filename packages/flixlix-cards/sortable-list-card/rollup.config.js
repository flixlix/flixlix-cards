import { createCardConfig } from "@flixlix-cards/bundler";

export default createCardConfig({
  input: "src/sortable-list-card.ts",
  outDir: "dist",
  port: 5005,
});
