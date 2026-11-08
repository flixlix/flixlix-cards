import { debounce } from "custom-card-helpers";

type CardMeta = {
  name: string;
  version: string;
  readme: string;
};

/** Replaced at build time by the bundler (commit and build time); undefined in tests. */
declare const __FLIXLIX_BUILD__: string | undefined;

const buildId = typeof __FLIXLIX_BUILD__ === "string" ? __FLIXLIX_BUILD__ : "dev build";

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

  console.groupCollapsed(
    `%c⚡ ${cardInfo.name} v${cardInfo.version} %c${buildId}`,
    "color: #488fc2; font-weight: bold",
    "color: inherit; font-weight: normal"
  );
  console.log("Readme:", cardInfo.readme);
  console.groupEnd();
};

export const logError = debounce((error: string) => {
  console.log(
    `%c⚡ ${cardInfo.name} v${cardInfo.version} %cError: ${error}`,
    "color: #488fc2; font-weight: bold",
    "color: #b33a3a; font-weight: normal"
  );
}, 60000);
