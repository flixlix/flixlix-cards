import { debounce } from "custom-card-helpers";

type CardMeta = {
  name: string;
  version: string;
  readme: string;
};

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

  // Log Version
  console.groupCollapsed(
    `%c⚡ ${cardInfo.name} v${cardInfo.version} is installed`,
    "color: #488fc2; font-weight: bold"
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
