import { default as indexConfig } from "./index.js";

/**
 * @type {import("prettier").Config}
 */
const config = {
  ...indexConfig,
  plugins: [...indexConfig.plugins, "prettier-plugin-tailwindcss"],
};

export default config;
