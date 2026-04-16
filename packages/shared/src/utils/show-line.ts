import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";

export const showLine = (config: FlowCardPlusConfig, power: number): boolean => {
  if (power > 0) return true;
  return config?.display_zero_lines?.mode !== "hide";
};
