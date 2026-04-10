import { type HomeSources } from "@/type";

const isHomeSourceKey = (key: string, homeSources: HomeSources): key is keyof HomeSources =>
  key in homeSources;

export const computeColor = (
  colorType: boolean | string | undefined,
  homeSources: HomeSources,
  homeLargestSource: string
): string => {
  let iconHomeColor: string = "var(--primary-text-color)";
  if (typeof colorType === "string" && isHomeSourceKey(colorType, homeSources)) {
    iconHomeColor = homeSources[colorType].color;
  }
  if (colorType === true && isHomeSourceKey(homeLargestSource, homeSources)) {
    iconHomeColor = homeSources[homeLargestSource].color;
  }
  return iconHomeColor;
};
