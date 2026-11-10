import { minifyCardTemplates } from "@flixlix-cards/bundler";
import { devtools } from "@tanstack/devtools-vite";
import { defineConfig, lazyPlugins } from "vite-plus";
import tsconfigPaths from "vite-tsconfig-paths";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

const config = defineConfig({
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
  },
  plugins: lazyPlugins(() => [
    nitro({ preset: "vercel" }),
    devtools(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    minifyCardTemplates({
      include: /\/packages\/(flixlix-cards\/[^/]+\/src|shared\/src\/(?!preview\/)).+\.ts$/,
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ]),
});

export default config;
