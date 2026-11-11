import { SEARCH_ENTRIES, type SearchEntry } from "@/components/docs/docs-search-index";

import { OG_IMAGE_SIZE, ogImageUrl, type OgImage } from "./og-images";
import { markdownUrl, SITE_NAME, SITE_URL } from "./site";

const HOME_TITLE = `Solar, battery and grid power flow cards for Home Assistant | ${SITE_NAME}`;
const HOME_DESCRIPTION =
  "Free, open-source Lovelace cards that show live solar, battery and grid power flowing through your home: Power Flow Card Plus, Home Flow Card, Energy Flow Card Plus and more.";

export const INDEXABLE_PAGES: SearchEntry[] = SEARCH_ENTRIES.filter(
  (entry) => entry.type === "page" && !isPlayground(entry.to)
);

function isPlayground(path: string) {
  return path.endsWith("/playground");
}

// Index routes match with a trailing slash ("/power-flow-card-plus/").
const normalizePath = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

function findPage(path: string) {
  const normalized = normalizePath(path);
  return SEARCH_ENTRIES.find((entry) => entry.type === "page" && entry.to === normalized);
}

export function findIndexablePage(path: string) {
  const normalized = normalizePath(path);
  return INDEXABLE_PAGES.find((entry) => entry.to === normalized);
}

function isCardSection(page: SearchEntry) {
  return page.card !== "general";
}

function pageTitle(page: SearchEntry) {
  if (page.to === "/") {
    return HOME_TITLE;
  }
  if (!isCardSection(page)) {
    return `${page.title} | ${SITE_NAME}`;
  }
  if (page.title === "Overview") {
    return `${page.breadcrumb} for Home Assistant | ${SITE_NAME}`;
  }
  return `${page.title} · ${page.breadcrumb} | ${SITE_NAME}`;
}

function pageDescription(page: SearchEntry) {
  if (page.to === "/" || !page.description) {
    return HOME_DESCRIPTION;
  }
  return isCardSection(page)
    ? `${page.breadcrumb}, a Home Assistant Lovelace card. ${page.description}`
    : page.description;
}

function ogImage(page: SearchEntry): OgImage {
  return page.card ?? "general";
}

function ogImageAlt(page: SearchEntry) {
  return isCardSection(page)
    ? `${page.breadcrumb} on a Home Assistant dashboard`
    : `${SITE_NAME}: Home Assistant energy cards`;
}

function softwareApplication(page: SearchEntry) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: page.breadcrumb,
    description: pageDescription(page),
    url: `${SITE_URL}${page.to}`,
    image: ogImageUrl(ogImage(page)),
    author: { "@type": "Person", name: "flixlix", url: "https://github.com/flixlix" },
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Home Assistant",
    license: "https://opensource.org/licenses/MIT",
    codeRepository: "https://github.com/flixlix/flixlix-cards",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

export function pageHead(path: string) {
  const page = findPage(path);
  if (!page) {
    return { meta: [], links: [] };
  }
  const url = `${SITE_URL}${page.to === "/" ? "" : page.to}`;
  const title = pageTitle(page);
  const description = pageDescription(page);
  const image = ogImageUrl(ogImage(page));
  const meta = [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:url", content: url },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
    { property: "og:image:width", content: String(OG_IMAGE_SIZE.width) },
    { property: "og:image:height", content: String(OG_IMAGE_SIZE.height) },
    { property: "og:image:alt", content: ogImageAlt(page) },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: image },
    ...(isPlayground(page.to) ? [{ name: "robots", content: "noindex, follow" }] : []),
    ...(isCardSection(page) && page.title === "Overview"
      ? [{ "script:ld+json": softwareApplication(page) }]
      : []),
  ];
  return {
    meta,
    links: [
      { rel: "canonical", href: url },
      ...(isPlayground(page.to)
        ? []
        : [{ rel: "alternate", type: "text/markdown", href: markdownUrl(page.to) }]),
    ],
  };
}
