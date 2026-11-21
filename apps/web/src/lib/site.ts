export const SITE_URL = "https://cards.flixlix.com";
export const SITE_NAME = "flixlix-cards";

export const markdownPath = (path: string) => `/llms${path === "/" ? "/index" : path}.md`;

export const markdownUrl = (path: string) => `${SITE_URL}${markdownPath(path)}`;
