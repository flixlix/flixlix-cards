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
  name: `${PILL} color: #fff; background: #d97706;`,
  version: `${PILL} color: #fff; background: #1f2937;`,
  prerelease: `${PILL} color: #fff; background: #db2777; letter-spacing: 0.05em;`,
  build: `${PILL} font-weight: 400; color: #6b7280; background: #e5e7eb; font-style: italic;`,
  error: "padding: 2px 6px; font-weight: 600; color: #b33a3a;",
};
const ROUND_START = "border-radius: 999px 0 0 999px;";
const ROUND_END = "border-radius: 0 999px 999px 0;";

type Segment = [text: string, style: string];

/** "beta" for 0.4.0-beta.0, "rc" for 1.0.0-rc.1, undefined for a stable version. */
const prereleaseTag = (version: string): string | undefined =>
  /^[^-]+-([a-z]+)/i.exec(version)?.[1];

/** Rounds the outer ends of the badge, so any number of segments forms one pill. */
const pill = (segments: Segment[]): Segment[] =>
  segments.map(([text, style], index) => [
    text,
    `${style} ${index === 0 ? ROUND_START : ""}${index === segments.length - 1 ? ROUND_END : ""}`,
  ]);

/** Name and version, a BETA/RC segment for pre-releases, and the build in dev builds. */
const badge = (card: CardMeta, build: string): Segment[] => {
  const tag = prereleaseTag(card.version);
  const segments: Segment[] = [
    [` ⚡ ${card.name} `, STYLES.name],
    [` v${card.version} `, STYLES.version],
  ];
  if (tag) {
    segments.push([` ${tag.toUpperCase()} `, STYLES.prerelease]);
  }
  if (build) {
    segments.push([` ${build} `, STYLES.build]);
  }
  return pill(segments);
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

  console.groupCollapsed(...consoleArgs(badge(cardInfo, buildId)));
  console.log("Readme:", cardInfo.readme);
  if (prereleaseTag(cardInfo.version)) {
    console.log(
      "This is a pre-release. Please report problems at https://github.com/flixlix/flixlix-cards/issues"
    );
  }
  console.groupEnd();
};

export const logError = debounce((error: string) => {
  console.log(...consoleArgs([...badge(cardInfo, ""), [` ${error}`, STYLES.error]]));
}, 60000);
