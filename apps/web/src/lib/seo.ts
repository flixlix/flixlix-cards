import { SEARCH_ENTRIES, type SearchEntry } from "@/components/docs/docs-search-index";

import { SITE_NAME, SITE_URL } from "./site";

const HOME_TITLE = `${SITE_NAME}: Home Assistant energy cards`;
const HOME_DESCRIPTION =
  "Open-source Lovelace cards that show where your home's electricity comes from and where it goes.";

export const INDEXABLE_PAGES: SearchEntry[] = SEARCH_ENTRIES.filter(
  (entry) => entry.type === "page" && !isPlayground(entry.to)
);

function isPlayground(path: string) {
  return path.endsWith("/playground");
}

// Index routes match with a trailing slash ("/power-flow-card-plus/").
function findPage(path: string) {
  const normalized = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return SEARCH_ENTRIES.find((entry) => entry.type === "page" && entry.to === normalized);
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

function softwareApplication(page: SearchEntry) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: page.breadcrumb,
    description: pageDescription(page),
    url: `${SITE_URL}${page.to}`,
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
  const meta = [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:url", content: url },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { name: "twitter:card", content: "summary" },
    ...(isPlayground(page.to) ? [{ name: "robots", content: "noindex, follow" }] : []),
    ...(isCardSection(page) && page.title === "Overview"
      ? [{ "script:ld+json": softwareApplication(page) }]
      : []),
  ];
  return { meta, links: [{ rel: "canonical", href: url }] };
}
