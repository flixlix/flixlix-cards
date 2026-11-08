import { debounce } from "custom-card-helpers";

type CardMeta = {
  name: string;
  version: string;
  readme: string;
};

/** Replaced at build time by the bundler: commit and build time, or "" in release builds. */
declare const __FLIXLIX_BUILD__: string | undefined;

const buildId = typeof __FLIXLIX_BUILD__ === "string" ? __FLIXLIX_BUILD__ : "dev build";

const PILL = "padding: 2px 8px; font-weight: 600; line-height: 1.6;";
const STYLES = {
  name: `${PILL} color: #fff; border-radius: 999px 0 0 999px; background: linear-gradient(90deg, #f59e0b, #488fc2);`,
  version: `${PILL} color: #fff; background: #1f2937; border-radius: 0 999px 999px 0;`,
  versionBeforeBuild: `${PILL} color: #fff; background: #1f2937;`,
  build: `${PILL} font-weight: 400; color: #6b7280; background: #e5e7eb; border-radius: 0 999px 999px 0; font-style: italic;`,
  error: "padding: 2px 6px; font-weight: 600; color: #b33a3a;",
};

type Segment = [text: string, style: string];

/** The badge segments; dev builds get a third, muted segment with commit and build time. */
const badge = (card: CardMeta, extra?: Segment): Segment[] => {
  const name: Segment = [` ⚡ ${card.name} `, STYLES.name];
  if (extra) {
    return [name, [` v${card.version} `, STYLES.versionBeforeBuild], extra];
  }
  return [name, [` v${card.version} `, STYLES.version]];
};

const consoleArgs = (segments: Segment[]): string[] => [
  segments.map(([text]) => `%c${text}`).join(""),
  ...segments.map(([, style]) => style),
];

let cardInfo: CardMeta = {
  name: "Unknown Card",
  version: "0.0.0",
  readme: "https://github.com/flixlix/",
};

/**
 * Initializes the logger with specific card metadata.
 * Called once at the entry point of each card.
 */
export const setupLogger = (options: CardMeta) => {
  cardInfo = options;

  const build: Segment | undefined = buildId ? [` ${buildId} `, STYLES.build] : undefined;
  console.groupCollapsed(...consoleArgs(badge(cardInfo, build)));
  console.log("Readme:", cardInfo.readme);
  console.groupEnd();
};

export const logError = debounce((error: string) => {
  console.log(...consoleArgs([...badge(cardInfo), [` ${error}`, STYLES.error]]));
}, 60000);
