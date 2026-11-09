import { createCardConfig } from "@flixlix-cards/bundler";
import { defineConfig } from "vite-plus";

export default defineConfig(
  createCardConfig({ entry: "src/sortable-list-card.ts", name: "sortable-list-card", port: 5005 })
);
