import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { getPrimaryBattery } from "@flixlix-cards/shared/utils/normalize-batteries";

type InvertibleEntityType = Exclude<
  keyof FlowCardPlusConfig["entities"],
  "individual" | "individual1" | "individual2"
>;

export const isEntityInverted = (config: FlowCardPlusConfig, entityType: InvertibleEntityType) => {
  if (entityType === "battery") {
    return !!getPrimaryBattery(config.entities.battery)?.invert_state;
  }
  return !!config.entities[entityType]?.invert_state;
};
