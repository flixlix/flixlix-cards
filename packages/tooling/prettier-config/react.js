import { default as indexConfig } from "./index.js";

/**
 * @type {import("prettier").Config}
 */
const config = {
  ...indexConfig,
  tailwindFunctions: ["cn", "cva"],
  plugins: ["prettier-plugin-tailwindcss", ...indexConfig.plugins],
};

export default config;
