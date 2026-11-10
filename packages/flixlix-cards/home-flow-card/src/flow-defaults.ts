import {
  assertRenderableFlowCardConfig,
  clickableEntitiesWithDefault,
  displayZeroLinesWithDefaults,
} from "@flixlix-cards/shared/utils/flow-card-config";
import { defaultValues } from "@flixlix-cards/shared/utils/get-default-config";
import { coerceNumber } from "@flixlix-cards/shared/utils/utils";
import { type FlowConfig } from "./types";

export const withDefaults = (config: FlowConfig): FlowConfig => {
  assertRenderableFlowCardConfig(config);
  return {
    ...config,
    min_flow_rate: coerceNumber(config.min_flow_rate, defaultValues.minFlowRate),
    max_flow_rate: coerceNumber(config.max_flow_rate, defaultValues.maxFlowRate),
    base_decimals: coerceNumber(config.base_decimals, defaultValues.baseDecimals),
    kilo_decimals: coerceNumber(config.kilo_decimals, defaultValues.kiloDecimals),
    kilo_threshold: coerceNumber(config.kilo_threshold, defaultValues.kiloThreshold),
    mega_threshold: coerceNumber(config.mega_threshold, defaultValues.megaThreshold),
    display_zero_lines: displayZeroLinesWithDefaults(config.display_zero_lines),
    clickable_entities: clickableEntitiesWithDefault(config.clickable_entities),
  };
};
