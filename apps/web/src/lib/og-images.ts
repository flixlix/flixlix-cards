import { SITE_URL } from "./site.ts";

export const OG_IMAGES = [
  "general",
  "power",
  "house",
  "energy",
  "breakdown",
  "period",
  "sortable",
] as const;

export type OgImage = (typeof OG_IMAGES)[number];

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export const ogImageUrl = (image: OgImage) => `${SITE_URL}/og/${image}.png`;

export const isOgImage = (value: string): value is OgImage =>
  OG_IMAGES.some((image) => image === value);
