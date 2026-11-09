import { createCardConfig } from "@flixlix-cards/bundler";
import { defineConfig } from "vite-plus";

export default defineConfig(
  createCardConfig({
    entry: "src/energy-breakdown-card.ts",
    name: "energy-breakdown-card",
    port: 5004,
  })
);
