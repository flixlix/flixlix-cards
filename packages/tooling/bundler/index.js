import { parse } from "acorn";
import minifyHTMLLiterals from "rollup-plugin-minify-html-literals";
import { execSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";

// Home Assistant's own legacy-build floors (home-assistant/frontend .browserslistrc):
// Chrome 67 covers Chromecast 1st gen (Chrome 70), Nest Hub and old kiosk webviews.
// Safari/iOS and Firefox stay at their previous, lower floors.
export const browserTargets = ["chrome67", "edge79", "firefox80", "safari15", "ios15"];
// The newest syntax every browser in browserTargets parses: Chrome 67 stops before `?.` and `??`.
const ecmaVersion = 2019;

/** @returns {import("vite-plus").Plugin} */
function legacySyntaxGuard() {
  return {
    name: "legacy-syntax-guard",
    apply: "build",
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
              `${chunk.fileName} contains syntax newer than ES${ecmaVersion}, which ${browserTargets.join(", ")} cannot parse: ` +
              `${error.message} near "${chunk.code.slice(Math.max(0, position - 40), position + 40)}".`,
            cause: error,
          });
        }
      }
    },
  };
}

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

/** Release builds (RELEASE_BUILD=true in the release workflow) stamp an empty id: users see only the version. */
const buildStamp = (release = globalThis.process.env.RELEASE_BUILD === "true") =>
  release ? "" : buildId();

/**
 * Serves the build output with CORS while `vp build --watch` runs, so a Home Assistant instance
 * elsewhere can load the card from `http://<host>:<port>/<card>.js`.
 */
/**
 * @param {string} outDir
 * @param {number} port
 * @returns {import("vite-plus").Plugin}
 */
function serveWhileWatching(outDir, port) {
  let started = false;
  return {
    name: "serve-while-watching",
    apply: "build",
    buildStart() {
      if (started || !this.meta.watchMode) {
        return;
      }
      started = true;
      const root = normalize(outDir);
      createServer((request, response) => {
        const file = normalize(
          join(root, decodeURIComponent(new URL(request.url ?? "/", "http://card").pathname))
        );
        response.setHeader("Access-Control-Allow-Origin", "*");
        if (!file.startsWith(root)) {
          response.writeHead(403).end();
          return;
        }
        readFile(file).then(
          (body) =>
            response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" }).end(body),
          () => response.writeHead(404).end()
        );
      }).listen(port, "0.0.0.0");
      this.info(`serving ${outDir} on http://localhost:${port}`);
    },
  };
}

const minifyTemplates =
  typeof minifyHTMLLiterals === "function" ? minifyHTMLLiterals : minifyHTMLLiterals.default;

/**
 * The Vite+ config that bundles a card into one ES module, `<outDir>/<name>.js`, that Home
 * Assistant loads as a dashboard resource.
 *
 * @param {{ entry: string; name: string; outDir?: string; port?: number }} options
 * @returns {import("vite-plus").UserConfig}
 */
export function createCardConfig({ entry, name, outDir = "dist", port = 5001 }) {
  return {
    define: { __FLIXLIX_BUILD__: JSON.stringify(buildStamp()) },
    plugins: [minifyTemplates(), legacySyntaxGuard(), serveWhileWatching(outDir, port)],
    build: {
      outDir,
      target: browserTargets,
      lib: { entry, formats: ["es"], fileName: () => `${name}.js` },
      rolldownOptions: {
        output: {
          codeSplitting: false,
          // Pinned: the minifier otherwise targets esnext and reintroduces `?.` and `??`.
          minify: { compress: { target: browserTargets }, mangle: true, codegen: true },
        },
      },
    },
  };
}
