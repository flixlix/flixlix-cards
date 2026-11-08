import { type PowerFlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type ChargeSeverity } from "@flixlix-cards/shared/utils/severity";

/** Red below 15 %, yellow below 30 %, green above. */
export const DEFAULT_STATE_OF_CHARGE_SEVERITY: ChargeSeverity = { red: 15, yellow: 30 };

/** Power Flow Card Plus' config, so a card can switch between the two by changing its type. */
export interface PowerFlowHouseCardConfig extends PowerFlowCardPlusConfig {
  /** Roll the numbers to their new value when a reading changes. Defaults to true. */
  animate_numbers?: boolean;
  /**
   * Where the battery's charge bar turns red and yellow, in %; it is green above both. Defaults
   * to `DEFAULT_STATE_OF_CHARGE_SEVERITY`.
   */
  state_of_charge_severity?: ChargeSeverity;
}
