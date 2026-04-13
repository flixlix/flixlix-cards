import { type EnergyFlowCardPlusConfig } from "@/energy-flow-card-plus-config";

type InvertibleEntityType = Exclude<keyof EnergyFlowCardPlusConfig["entities"], "individual">;

export const isEntityInverted = (
  config: EnergyFlowCardPlusConfig,
  entityType: InvertibleEntityType
) => !!config.entities[entityType]?.invert_state;
