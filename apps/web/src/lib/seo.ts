import { SEARCH_ENTRIES, type SearchEntry } from "@/components/docs/docs-search-index";

import { OG_IMAGE_SIZE, ogImageUrl, type OgImage } from "./og-images";
import { pageMeta } from "./page-meta";
import { markdownUrl, SITE_NAME, SITE_URL } from "./site";

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
  return pageMeta(page.to).title;
}

function pageDescription(page: SearchEntry) {
  return pageMeta(page.to).description;
}

function ogImage(page: SearchEntry): OgImage {
  return page.card ?? "general";
}

function ogImageAlt(page: SearchEntry) {
  return isCardSection(page)
    ? `${page.breadcrumb} on a Home Assistant dashboard`
    : `${SITE_NAME}: Home Assistant energy cards`;
}

function website() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: pageMeta("/").description,
  };
}

function softwareApplication(page: SearchEntry) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: page.breadcrumb,
    description: pageDescription(page),
    url: `${SITE_URL}${page.to}`,
    image: ogImageUrl(ogImage(page)),
    author: { "@type": "Person", name: "Luca", url: "https://github.com/flixlix" },
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
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    ...(isPlayground(page.to) ? [{ name: "robots", content: "noindex, follow" }] : []),
    ...(page.to === "/" ? [{ "script:ld+json": website() }] : []),
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
