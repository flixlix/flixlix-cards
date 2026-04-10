/**
 * @type {import("prettier").Config}
 */
const config = {
  semi: true,
  singleQuote: false,
  printWidth: 100,
  tabWidth: 2,
  trailingComma: "es5",
  arrowParens: "always",
  plugins: ["prettier-plugin-organize-imports"],
};

export default config;
