import { type LovelaceCardConfig } from "custom-card-helpers";
import { type SelectedPeriod } from "@flixlix-cards/shared/states/utils/selected-period";

export type ButtonStyle = "icon" | "text";

export interface EnergyPeriodSelectorPlusConfig extends LovelaceCardConfig {
  title?: string;
  card_background?: boolean;
  /** Same as HA's energy cards: which energy collection (dashboard) to drive. */
  collection_key?: string;
  prev_next_buttons?: boolean;
  compare_button_type?: ButtonStyle | "";
  compare_button_label?: string;
  today_button_type?: ButtonStyle | false;
  period_buttons?: SelectedPeriod[];
  custom_period_label?: string;
}
