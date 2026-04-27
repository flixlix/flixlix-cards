import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";

type InvertibleEntityType = Exclude<
  keyof FlowCardPlusConfig["entities"],
  "individual" | "individual1" | "individual2"
>;

export const isEntityInverted = (config: FlowCardPlusConfig, entityType: InvertibleEntityType) =>
  !!config.entities[entityType]?.invert_state;
