import flixlixReactPrettierConfig from "@flixlix-cards/prettier-config/react";

/**
 * @type {import("prettier").Config}
 */
const config = {
  ...flixlixReactPrettierConfig,
  // needed for tailwind colors to be sorted correctly
  tailwindStylesheet: "./src/styles/globals.css",
};

export default config;
