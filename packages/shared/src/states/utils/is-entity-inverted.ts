import { type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";

type InvertibleEntityType = Exclude<keyof PowerFlowCardPlusConfig["entities"], "individual">;

export const isEntityInverted = (
  config: PowerFlowCardPlusConfig,
  entityType: InvertibleEntityType
) => !!config.entities[entityType]?.invert_state;
