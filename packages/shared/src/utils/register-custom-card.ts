import { setupLogger } from "./logging";

declare global {
  interface Window {
    customCards?: unknown[];
  }
}

interface RegisterCardParams {
  type: string;
  name: string;
  description: string;
  version: string;
}

const DOCS_URL = "https://cards.flixlix.com";

export function registerCustomCard(params: RegisterCardParams) {
  window.customCards ??= [];
  window.customCards.push({
    ...params,
    preview: true,
    documentationURL: `${DOCS_URL}/${params.type}/configuration`,
  });

  setupLogger({
    name: params.name,
    version: params.version,
    readme: `${DOCS_URL}/${params.type}`,
  });
}
