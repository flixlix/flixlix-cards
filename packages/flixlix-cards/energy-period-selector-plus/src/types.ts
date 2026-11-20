import { type LovelaceCardConfig } from "custom-card-helpers";
import {
  type PeriodDefinition,
  type SelectedPeriod,
} from "@flixlix-cards/shared/states/utils/selected-period";

export type ButtonStyle = "icon" | "text";

/** A built-in period, or one the user defines, e.g. a billing cycle. */
export type PeriodButton = SelectedPeriod | PeriodDefinition;

export interface EnergyPeriodSelectorPlusConfig extends LovelaceCardConfig {
  title?: string;
  card_background?: boolean;
  /** Same as HA's energy cards: which energy collection (dashboard) to drive. */
  collection_key?: string;
  prev_next_buttons?: boolean;
  /** Open HA's calendar from the date in every period, not only in `custom`. */
  date_picker?: boolean;
  compare_button_type?: ButtonStyle | "";
  compare_button_label?: string;
  today_button_type?: ButtonStyle | false;
  period_buttons?: PeriodButton[];
  custom_period_label?: string;
}
