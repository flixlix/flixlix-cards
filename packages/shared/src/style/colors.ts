type HomeSources = Record<string, { color: string }>;

const isHomeSourceKey = (key: string, homeSources: HomeSources): key is keyof HomeSources =>
  key in homeSources;

export const computeColor = (
  colorType: boolean | string | undefined,
  homeSources: HomeSources,
  homeLargestSource: string
): string => {
  let iconHomeColor = "var(--primary-text-color)";
  if (typeof colorType === "string" && isHomeSourceKey(colorType, homeSources)) {
    iconHomeColor = homeSources[colorType]?.color ?? iconHomeColor;
  }
  if (colorType === true && isHomeSourceKey(homeLargestSource, homeSources)) {
    iconHomeColor = homeSources[homeLargestSource]?.color ?? iconHomeColor;
  }
  return iconHomeColor;
};
