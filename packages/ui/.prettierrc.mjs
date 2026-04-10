import flixlixPrettierConfig from "@energy-cards/prettier-config";

/**
 * @type {import("prettier").Config}
 */
const config = {
  ...flixlixPrettierConfig,
  // needed for tailwind colors to be sorted correctly
  tailwindStylesheet: "./src/styles/globals.css",
};

export default config;
