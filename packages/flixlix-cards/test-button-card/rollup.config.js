import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/test-button-card.ts",
  output: {
    file: "dist/test-button-card.js",
    format: "es",
  },
  plugins: [resolve(), typescript()],
};
