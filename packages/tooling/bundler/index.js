import { babel } from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import { parse } from "acorn";
import typescript from "@rollup/plugin-typescript";
import minifyHTML from "rollup-plugin-minify-html-literals";
import serve from "rollup-plugin-serve";
import { execSync } from "node:child_process";

// Home Assistant's own legacy-build floors (home-assistant/frontend .browserslistrc):
// Chrome 67 covers Chromecast 1st gen (Chrome 70), Nest Hub and old kiosk webviews.
// Safari/iOS and Firefox stay at their previous, lower floors.
const browserTargets =
  "Chrome >= 67, Edge >= 79, Samsung >= 9, Firefox >= 80, Safari >= 15, iOS >= 15";
// The newest syntax every browser in browserTargets parses: Chrome 67 stops before `?.` and `??`.
const ecmaVersion = 2019;

function legacySyntaxGuard() {
  return {
    name: "legacy-syntax-guard",
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") {
          continue;
        }
        try {
          parse(chunk.code, { ecmaVersion, sourceType: "module" });
        } catch (error) {
          const position = error.pos ?? 0;
          this.error({
            message:
              `${chunk.fileName} contains syntax newer than ES${ecmaVersion}, which ${browserTargets} cannot parse: ` +
              `${error.message} near "${chunk.code.slice(Math.max(0, position - 40), position + 40)}". ` +
              "Is a dependency excluded from Babel?",
            cause: error,
          });
        }
      }
    },
  };
}

const BUILD_PLACEHOLDER = /\b__FLIXLIX_BUILD__\b/g;

function git(command) {
  try {
    return execSync(`git ${command}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

/** Identifies one build in the card's console banner: commit, uncommitted changes, build time. */
export function buildId(now = new Date()) {
  const commit = git("rev-parse --short HEAD") || "unknown";
  const dirty = git("status --porcelain") ? "+dirty" : "";
  const time = now.toISOString().slice(0, 16).replace("T", " ");
  return `${commit}${dirty} · built ${time} UTC`;
}

function buildStamp() {
  const id = JSON.stringify(buildId());
  return {
    name: "build-stamp",
    transform(code) {
      return BUILD_PLACEHOLDER.test(code)
        ? { code: code.replace(BUILD_PLACEHOLDER, id), map: null }
        : null;
    },
  };
}

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

  return {
    input,
    output: {
      dir: outDir,
      format: "es",
      inlineDynamicImports: true,
      sourcemap: !!watch,
    },
    plugins: [
      buildStamp(),
      ...(minifyHtmlPlugin ? [minifyHtmlPlugin()] : []),
      typescript({
        declaration: false,
        declarationMap: false,
        ignoreDeprecations: "6.0",
        compilerOptions: {
          rootDir: "../..",
          target: "es2020",
        },
        filterRoot: false,
        include: ["**/*.ts", "**/*.tsx", "../../shared/src/**/*.ts", "../../shared/src/**/*.tsx"],
      }),
      nodeResolve(),
      json({ compact: true }),
      commonjs(),
      babel({
        babelHelpers: "bundled",
        extensions: [".js", ".mjs", ".ts", ".tsx"],
        exclude: [/node_modules\/@mdi/],
        presets: [
          [
            "@babel/preset-env",
            {
              targets: browserTargets,
              bugfixes: true,
              modules: false,
            },
          ],
        ],
      }),
      ...(!watch
        ? [terser({ output: { comments: false } }), legacySyntaxGuard()]
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
      return thisAsWindowForModules.some((id_) => id.trimEnd().endsWith(id_))
        ? "window"
        : undefined;
    },
  };
}
