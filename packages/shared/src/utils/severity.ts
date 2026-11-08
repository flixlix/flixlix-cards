/** Where a battery's charge turns colour, in %: red below `red`, yellow below `yellow`. */
export type ChargeSeverity = { red?: number; yellow?: number };
export type ChargeLevel = "green" | "yellow" | "red";

const below = (value: number, threshold: number | undefined) =>
  typeof threshold === "number" && Number.isFinite(threshold) && value < threshold;

/**
 * A state of charge's colour: red below the red threshold, yellow below the yellow one, green
 * everywhere else. A threshold left out never applies.
 */
export const chargeLevel = (soc: number, severity: ChargeSeverity): ChargeLevel => {
  if (below(soc, severity.red)) {
    return "red";
  }
  return below(soc, severity.yellow) ? "yellow" : "green";
};
