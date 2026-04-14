import { type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";

export const showLine = (config: PowerFlowCardPlusConfig, power: number): boolean => {
  if (power > 0) return true;
  return config?.display_zero_lines?.mode !== "hide";
};
