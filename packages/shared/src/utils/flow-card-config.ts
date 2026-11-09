import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { defaultValues } from "./get-default-config";
import { coerceNumber } from "./utils";

/** Throws for a config a flow card cannot render: legacy individual1/2 keys or no grid, solar or battery entity. */
export const assertRenderableFlowCardConfig = (config: FlowCardPlusConfig): void => {
  const { entities } = config;
  if (entities?.individual1 || entities?.individual2) {
    throw new Error(
      "You are using an outdated configuration. Please update your configuration to the latest version. The individual1 and individual2 properties are now just a single individual array property. The easiest way to do this is to remove the individual1 and individual2 properties and replace them in the UI Editor."
    );
  }
  if (
    !entities ||
    (!entities.battery?.entity && !entities.grid?.entity && !entities.solar?.entity)
  ) {
    throw new Error("At least one entity for battery, grid or solar must be defined");
  }
};

export const displayZeroLinesWithDefaults = (
  lines: FlowCardPlusConfig["display_zero_lines"]
): NonNullable<FlowCardPlusConfig["display_zero_lines"]> => ({
  mode: lines?.mode ?? defaultValues.displayZeroLines.mode,
  transparency: coerceNumber(lines?.transparency, defaultValues.displayZeroLines.transparency),
  grey_color: lines?.grey_color ?? defaultValues.displayZeroLines.grey_color,
  ...(lines?.grey_out_circles === undefined ? {} : { grey_out_circles: lines.grey_out_circles }),
});

/**
 * Nodes are clickable unless the config says `false`: most configs predate the option and leave
 * it out. Normalised once in `setConfig` so every reader can treat it as a plain boolean.
 */
export const clickableEntitiesWithDefault = (value: boolean | undefined): boolean =>
  value !== false;
