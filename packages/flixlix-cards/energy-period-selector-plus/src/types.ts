export interface EnergyPeriodSelectorPlusConfig {
  type: string;
  collection_key?: string;
  vertical_opening_direction?: "auto" | "up" | "down";
  opening_direction?: "auto" | "right" | "left" | "center";
  disable_compare?: boolean;
  hide_overflow?: boolean;
}
