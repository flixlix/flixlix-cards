import { type IndividualDeviceType } from "@flixlix-cards/shared/types";

/**
 * An individual device's signed reading, plus its secondary entity's when `secondary_info.sum_total`
 * is set. Null only while neither entity has a reading.
 */
export const individualReading = (
  individual: IndividualDeviceType | undefined,
  read: (entity: string) => number | null
): number | null => {
  if (!individual?.entity) {
    return null;
  }
  const main = read(individual.entity);
  const secondaryEntity = individual.secondary_info?.entity;
  if (!individual.secondary_info?.sum_total || !secondaryEntity) {
    return main;
  }
  const secondary = read(secondaryEntity);
  return main === null && secondary === null ? null : (main ?? 0) + (secondary ?? 0);
};
