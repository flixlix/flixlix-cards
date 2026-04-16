import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";

type InvertibleEntityType = Exclude<keyof FlowCardPlusConfig["entities"], "individual">;

export const isEntityInverted = (config: FlowCardPlusConfig, entityType: InvertibleEntityType) =>
  !!config.entities[entityType]?.invert_state;
