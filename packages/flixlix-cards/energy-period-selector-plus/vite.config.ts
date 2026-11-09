import { createCardConfig } from "@flixlix-cards/bundler";
import { defineConfig } from "vite-plus";

export default defineConfig(
  createCardConfig({
    entry: "src/energy-period-selector-plus.ts",
    name: "energy-period-selector-plus",
    port: 5006,
  })
);
