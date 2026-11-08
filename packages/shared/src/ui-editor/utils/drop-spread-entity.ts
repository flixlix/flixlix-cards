const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * "Combined" stores `entity` as a string and "Separated" nests consumption/production under the
 * same key, so ha-form spreads the string into `{ 0: "s", 1: "e", … }` when a separated field is
 * filled in. Drops those index keys; also cleans configs already saved that way.
 */
export function dropSpreadEntity(value: Record<string, unknown>): Record<string, unknown> {
  if (!isRecord(value.entity)) {
    return value;
  }
  const entity = Object.fromEntries(
    Object.entries(value.entity).filter(([key]) => !/^\d+$/.test(key))
  );
  return { ...value, entity };
}
