import { type EnergyFlowCardPlusConfig } from "@/energy-flow-card-plus-config";

export const showLine = (config: EnergyFlowCardPlusConfig, power: number): boolean => {
  if (power > 0) return true;
  return config?.display_zero_lines?.mode !== "hide";
};
