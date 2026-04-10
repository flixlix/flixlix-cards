import { default as indexConfig } from "./index.js";

/**
 * @type {import("prettier").Config}
 */
const config = {
  ...indexConfig,
  plugins: ["prettier-plugin-embed", ...indexConfig.plugins],
  embeddedLanguageFormatting: "auto",
  embeddedHtmlTags: ["svg"],
};

export default config;
