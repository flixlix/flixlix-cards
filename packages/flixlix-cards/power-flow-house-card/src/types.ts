import { type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";

/** Power Flow Card Plus' config, so a card can switch between the two by changing its type. */
export interface PowerFlowHouseCardConfig extends PowerFlowCardPlusConfig {
  /** Roll the numbers to their new value when a reading changes. Defaults to true. */
  animate_numbers?: boolean;
}
