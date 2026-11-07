import { CIRCLE_CIRCUMFERENCE } from "@flixlix-cards/shared/const/circle";
import { type IndividualObject } from "@flixlix-cards/shared/types";
import { type Formatter } from "./format";
import { type Settled } from "./nodes";
import { type CardStateInput, type HomeRing, type ReadyReadings } from "./types";

const usageText = (
  input: CardStateInput,
  readings: ReadyReadings,
  consumption: number,
  individuals: IndividualObject[],
  format: Formatter
): string => {
  const home = input.config.entities.home;
  const individualConsumption = individuals.reduce(
    (sum, individual) => sum + (individual.has ? (individual.state ?? 0) : 0),
    0
  );
  const options = { unit: home?.unit_of_measurement, unitWhiteSpace: home?.unit_white_space };
  if (home?.override_state && home.entity) {
    const reading = readings.home ?? 0;
    return format(home.subtract_individual ? reading - individualConsumption : reading, options);
  }
  return format(
    home?.subtract_individual ? consumption - individualConsumption || 0 : consumption,
    options
  );
};

/** The home circle's segments: each source's share of home consumption, as arc lengths. */
export const computeHomeRing = (
  input: CardStateInput,
  readings: ReadyReadings,
  settled: Settled,
  individuals: IndividualObject[],
  format: Formatter
): HomeRing => {
  const solarToHome = settled.solarToHome ?? 0;
  const nonFossil = settled.nonFossilPower ?? 0;
  const consumption = Math.max(settled.gridToHome + solarToHome + settled.batteryToHome, 0);
  const arc = (value: number) =>
    consumption > 0 ? CIRCLE_CIRCUMFERENCE * (value / consumption) : 0;
  const segments = {
    battery: arc(settled.batteryToHome),
    solar: arc(solarToHome),
    grid: arc(consumption - nonFossil - settled.batteryToHome - solarToHome),
    gridNonFossil: arc(nonFossil),
  };
  const sources = ["battery", "solar", "grid", "gridNonFossil"] as const;
  const largestSource = sources.reduce((a, b) => (segments[a] > segments[b] ? a : b));
  return {
    battery: segments.battery,
    solar: segments.solar,
    grid: segments.grid,
    nonFossil: segments.gridNonFossil,
    largestSource,
    usageText: usageText(input, readings, consumption, individuals, format),
  };
};
