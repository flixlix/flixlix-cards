import { type BaseConfigEntity } from "@flixlix-cards/shared/types";

export type DisplayState = BaseConfigEntity["display_state"];

/** Whether one direction of a two-way node (in/out, import/export) is shown under its display_state. */
export const directionShown = (
  displayState: DisplayState,
  { nonZero, oneWay }: { nonZero: boolean; oneWay: boolean }
): boolean => {
  if (displayState === "one_way_no_zero") {
    return nonZero;
  }
  if (displayState === "one_way") {
    return oneWay;
  }
  return displayState === "two_way" || displayState === undefined;
};
