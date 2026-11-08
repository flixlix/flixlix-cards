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
export function registerCustomCard(params: RegisterCardParams) {
  const readmeURL = `https://github.com/flixlix/${params.type}`;
  window.customCards ??= [];
  window.customCards.push({
    ...params,
    preview: true,
    documentationURL: readmeURL,
  });

  setupLogger({
    name: params.name,
    version: params.version,
    readme: readmeURL,
  });
}
