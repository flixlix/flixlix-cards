export type { HomeAssistant } from "custom-card-helpers";

export type Constructor<T = object> = new (...args: any[]) => T;

export interface HaDateRangePicker extends HTMLElement {
  open(): void;
  popoverPlacement?: string;
}
