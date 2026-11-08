import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { defaultValues } from "./get-default-config";
import { coerceNumber } from "./utils";

type Entities = FlowCardPlusConfig["entities"];

const hasBatteryEntity = (battery: Entities["battery"]): boolean => {
  const entity = battery?.entity;
  return typeof entity === "object" ? !!(entity.consumption || entity.production) : !!entity;
};

/** Whether the config has a grid, solar or battery entity: a node the home is supplied from. */
export const hasSourceEntity = (entities: Entities | undefined): boolean =>
  !!entities &&
  (hasBatteryEntity(entities.battery) || !!entities.grid?.entity || !!entities.solar?.entity);

/**
 * Whether the card shows only individual devices around the home: no grid, solar or battery.
 * The home then has no sources to be balanced from, so its consumption is read from the home
 * entity, or summed from the devices.
 */
export const isDeviceOnly = (entities: Entities | undefined): boolean => !hasSourceEntity(entities);

type AssertOptions = {
  /**
   * Accept a config without grid, solar or battery, as long as it has a home entity or at least
   * one individual device. Only the power flow card renders such a config.
   */
  allowDeviceOnly?: boolean;
};

const hasDeviceOnlyContent = (entities: Entities): boolean =>
  !!entities.home?.entity || (entities.individual ?? []).some((device) => !!device?.entity);

/** Throws for a config a flow card cannot render: legacy individual1/2 keys or nothing to show. */
export const assertRenderableFlowCardConfig = (
  config: FlowCardPlusConfig,
  { allowDeviceOnly = false }: AssertOptions = {}
): void => {
  const { entities } = config;
  if (entities?.individual1 || entities?.individual2) {
    throw new Error(
      "You are using an outdated configuration. Please update your configuration to the latest version. The individual1 and individual2 properties are now just a single individual array property. The easiest way to do this is to remove the individual1 and individual2 properties and replace them in the UI Editor."
    );
  }
  if (!entities) {
    throw new Error("At least one entity for battery, grid or solar must be defined");
  }
  if (hasSourceEntity(entities)) {
    return;
  }
  if (allowDeviceOnly && hasDeviceOnlyContent(entities)) {
    return;
  }
  throw new Error(
    allowDeviceOnly
      ? "At least one entity for battery, grid, solar, home or an individual device must be defined"
      : "At least one entity for battery, grid or solar must be defined"
  );
};

export const displayZeroLinesWithDefaults = (
  lines: FlowCardPlusConfig["display_zero_lines"]
): NonNullable<FlowCardPlusConfig["display_zero_lines"]> => ({
  mode: lines?.mode ?? defaultValues.displayZeroLines.mode,
  transparency: coerceNumber(lines?.transparency, defaultValues.displayZeroLines.transparency),
  grey_color: lines?.grey_color ?? defaultValues.displayZeroLines.grey_color,
});
