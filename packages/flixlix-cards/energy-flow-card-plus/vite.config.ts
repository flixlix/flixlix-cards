import { createCardConfig } from "@flixlix-cards/bundler";
import { defineConfig } from "vite-plus";

export default defineConfig(
  createCardConfig({
    entry: "src/energy-flow-card-plus.ts",
    name: "energy-flow-card-plus",
    port: 5003,
  })
);
