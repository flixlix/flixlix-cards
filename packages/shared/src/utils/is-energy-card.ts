import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";

export const isEnergyCard = (config: FlowCardPlusConfig) => {
  return config.type.includes("energy-flow-card-plus");
};
