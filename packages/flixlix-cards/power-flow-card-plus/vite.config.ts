import { createCardConfig } from "@flixlix-cards/bundler";
import { defineConfig } from "vite-plus";

export default defineConfig(
  createCardConfig({ entry: "src/power-flow-card-plus.ts", name: "power-flow-card-plus" })
);
