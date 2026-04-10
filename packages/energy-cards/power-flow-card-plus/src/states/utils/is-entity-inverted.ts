import { type PowerFlowCardPlusConfig } from "@/power-flow-card-plus-config";

type InvertibleEntityType = Exclude<keyof PowerFlowCardPlusConfig["entities"], "individual">;

export const isEntityInverted = (
  config: PowerFlowCardPlusConfig,
  entityType: InvertibleEntityType
) => !!config.entities[entityType]?.invert_state;
