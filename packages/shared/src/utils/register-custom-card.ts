import { setupLogger } from "./logging";

interface RegisterCardParams {
  type: string;
  name: string;
  description: string;
  version: string;
}
export function registerCustomCard(params: RegisterCardParams) {
  const readmeURL = `https://github.com/flixlix/${params.type}`;
  const windowWithCards = window as unknown as Window & {
    customCards: unknown[];
  };
  windowWithCards.customCards = windowWithCards.customCards || [];

  windowWithCards.customCards.push({
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
