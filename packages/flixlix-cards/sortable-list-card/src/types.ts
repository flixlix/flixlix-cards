import { type LovelaceCardConfig } from "custom-card-helpers";

export type SortableListValueFormat = "csv" | "json";

export type SortableListItemConfig = {
  key?: string;
  entity?: string;
  name?: string;
  icon?: string;
};

export type SortableListSaveAction = {
  service: string;
  data?: Record<string, unknown>;
  target?: Record<string, unknown>;
};

export type SortableListCardConfig = LovelaceCardConfig & {
  type: string;
  title?: string;
  entity?: string;
  value_format?: SortableListValueFormat;
  save_action?: SortableListSaveAction;
  items: SortableListItemConfig[];
  show_handle?: boolean;
  show_arrows?: boolean;
  show_rank?: boolean;
  show_state?: boolean;
};

export type ResolvedItem = {
  key: string;
  name: string;
  icon?: string;
  entity?: string;
  state?: string;
};
