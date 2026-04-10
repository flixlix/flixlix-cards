import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import minifyHTML from "rollup-plugin-minify-html-literals";
import serve from "rollup-plugin-serve";

export function createCardConfig(options) {
  const {
    input = "src/main.ts",
    outDir = "dist",
    port = 5001,
    watch = globalThis.process.env.ROLLUP_WATCH,
  } = options;
  const minifyHtmlPlugin =
    typeof minifyHTML === "function"
      ? minifyHTML
      : typeof minifyHTML?.default === "function"
        ? minifyHTML.default
        : typeof minifyHTML?.minifyHTMLLiterals === "function"
          ? minifyHTML.minifyHTMLLiterals
          : null;
  const babelPlugin =
    typeof babel === "function"
      ? babel
      : typeof babel?.babel === "function"
        ? babel.babel
        : typeof babel?.default === "function"
          ? babel.default
          : null;

  return {
    input,
    output: {
      dir: outDir,
      format: "es",
      inlineDynamicImports: true,
      sourcemap: !!watch,
    },
    plugins: [
      ...(minifyHtmlPlugin ? [minifyHtmlPlugin()] : []),
      typescript({
        declaration: false,
      }),
      nodeResolve(),
      json({ compact: true }),
      commonjs(),
      ...(babelPlugin
        ? [
            babelPlugin({
              exclude: "node_modules/**",
              babelHelpers: "bundled",
            }),
          ]
        : []),
      ...(!watch
        ? [terser({ output: { comments: false } })]
        : [
            serve({
              contentBase: [outDir],
              host: "0.0.0.0",
              port,
              allowCrossOrigin: true,
              headers: { "Access-Control-Allow-Origin": "*" },
            }),
          ]),
    ],
    moduleContext: (id) => {
      const thisAsWindowForModules = [
        "node_modules/@formatjs/intl-utils/lib/src/diff.js",
        "node_modules/@formatjs/intl-utils/lib/src/resolve-locale.js",
      ];
      if (thisAsWindowForModules.some((id_) => id.trimEnd().endsWith(id_))) {
        return "window";
      }
    },
  };
}
