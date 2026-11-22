import { parse, stringify } from "yaml";

const ORIGINAL_TYPE = "custom:power-flow-card";
const PLUS_TYPE = "custom:power-flow-card-plus";

type Fields = Record<string, unknown>;

/** An option of the original card that has no place in a Plus config, and why. */
export type LeftOut = { option: string; reason: string };

export type Migration =
  | { status: "empty" }
  | { status: "invalid"; message: string }
  | { status: "no-card"; alreadyPlus: boolean }
  | { status: "migrated"; yaml: string; leftOut: LeftOut[] };

const isFields = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const RENAMED_OPTIONS: Record<string, string> = {
  w_decimals: "base_decimals",
  kw_decimals: "kilo_decimals",
  watt_threshold: "kilo_threshold",
};

const NO_CIRCLE: Record<string, string> = {
  gas: "Plus has no gas circle. Its auxiliary circle can show one reading like this.",
  water: "Plus has no water circle. Its auxiliary circle can show one reading like this.",
};

/** The original card takes the list as `battery, grid` or as a YAML list. */
const invertedNodes = (option: unknown): Set<string> => {
  const names = Array.isArray(option)
    ? option
    : typeof option === "string"
      ? option.split(",")
      : [];
  return new Set(names.map((name) => String(name).trim()));
};

/**
 * The original card only flips a single sensor's sign: with separate consumption and production
 * sensors it ignores `inverted_entities`.
 */
const plusNode = (sensor: unknown, inverted: boolean, options: Fields = {}): Fields => {
  if (isFields(sensor) && "entity" in sensor) {
    return { ...sensor, ...options };
  }
  return {
    entity: sensor,
    ...options,
    ...(inverted && typeof sensor === "string" ? { invert_state: true } : {}),
  };
};

const plusEntities = (entities: Fields, inverted: Set<string>, leftOut: LeftOut[]): Fields => {
  const charge = entities.battery_charge;
  const migrated: Fields = {};
  for (const [name, sensor] of Object.entries(entities)) {
    const reason = NO_CIRCLE[name];
    if (reason) {
      leftOut.push({ option: `entities.${name}`, reason });
    } else if (name === "battery") {
      migrated.battery = plusNode(
        sensor,
        inverted.has(name),
        charge === undefined ? {} : { state_of_charge: charge }
      );
    } else if (name !== "battery_charge") {
      migrated[name] = plusNode(sensor, inverted.has(name));
    }
  }
  if (charge !== undefined && entities.battery === undefined) {
    leftOut.push({
      option: "entities.battery_charge",
      reason: "The state of charge is shown on the battery circle, which needs a battery sensor.",
    });
  }
  return migrated;
};

const plusCard = (card: Fields, leftOut: LeftOut[]): Fields => {
  const inverted = invertedNodes(card.inverted_entities);
  const migrated: Fields = { type: PLUS_TYPE };
  for (const [option, value] of Object.entries(card)) {
    if (option === "entities" && isFields(value)) {
      migrated.entities = plusEntities(value, inverted, leftOut);
    } else if (option !== "type" && option !== "inverted_entities") {
      migrated[RENAMED_OPTIONS[option] ?? option] = value;
    }
  }
  return migrated;
};

const describeError = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause));

const migratedYaml = (config: unknown, leftOut: LeftOut[]): Migration => ({
  status: "migrated",
  yaml: stringify(config, { lineWidth: 0 }),
  leftOut,
});

/**
 * Rewrites every `custom:power-flow-card` in the pasted YAML as a Power Flow Card Plus config. The
 * paste can be the card alone or anything holding it, such as a stack, a view or a whole dashboard;
 * everything that is not the original card is kept as it is.
 */
export function migratePowerFlowCard(text: string): Migration {
  if (!text.trim()) {
    return { status: "empty" };
  }
  let pasted: unknown;
  try {
    pasted = parse(text);
  } catch (cause) {
    return { status: "invalid", message: describeError(cause) };
  }

  const leftOut: LeftOut[] = [];
  let originalCards = 0;
  let plusCards = 0;
  const migrateWithin = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(migrateWithin);
    }
    if (!isFields(value)) {
      return value;
    }
    if (value.type === ORIGINAL_TYPE) {
      originalCards += 1;
      return plusCard(value, leftOut);
    }
    if (value.type === PLUS_TYPE) {
      plusCards += 1;
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, migrateWithin(child)])
    );
  };

  // A card pasted without its `type` line is still the original card's config.
  if (isFields(pasted) && pasted.type === undefined && isFields(pasted.entities)) {
    return migratedYaml(plusCard(pasted, leftOut), leftOut);
  }
  const migrated = migrateWithin(pasted);
  if (originalCards === 0) {
    return { status: "no-card", alreadyPlus: plusCards > 0 };
  }
  return migratedYaml(migrated, leftOut);
}
