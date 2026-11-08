import { CIRCLE_CIRCUMFERENCE } from "@flixlix-cards/shared/const/circle";
import { type IndividualObject } from "@flixlix-cards/shared/types";
import { isDeviceOnly } from "@flixlix-cards/shared/utils/flow-card-config";
import { type Formatter } from "./format";
import { type Balance } from "./nodes";
import { type NodeFlows } from "./solve";
import { type CardStateInput, type HomeRing } from "./types";

type Segments = Readonly<Pick<HomeRing, "battery" | "solar" | "grid" | "nonFossil">>;

/** Arc lengths of each source's share of home; they sum to the circumference, or are all 0. */
export const ringSegments = (flows: NodeFlows): Segments => {
  if (flows.home <= 0) {
    return { battery: 0, solar: 0, grid: 0, nonFossil: 0 };
  }
  const arc = (value: number) => CIRCLE_CIRCUMFERENCE * (value / flows.home);
  const battery = arc(flows.batteryToHome);
  const solar = arc(flows.solarToHome);
  const nonFossil = arc(flows.nonFossilToHome);
  return {
    battery,
    solar,
    nonFossil,
    grid: Math.max(CIRCLE_CIRCUMFERENCE - battery - solar - nonFossil, 0),
  };
};

const usageText = (
  input: CardStateInput,
  { totals, flows }: Balance,
  individuals: IndividualObject[],
  format: Formatter
): string => {
  const home = input.config.entities.home;
  const individualConsumption = individuals.reduce(
    (sum, individual) => sum + (individual.has ? (individual.state ?? 0) : 0),
    0
  );
  const options = {
    unit: home?.unit_of_measurement,
    unitWhiteSpace: home?.unit_white_space,
    reading: true,
  };
  const consumption = totals.measuredHome ?? flows.home;
  return format(
    home?.subtract_individual ? consumption - individualConsumption : consumption,
    options
  );
};

/** The home circle's segments: each source's share of home consumption, as arc lengths. */
export const computeHomeRing = (
  input: CardStateInput,
  balance: Balance,
  individuals: IndividualObject[],
  format: Formatter
): HomeRing => {
  const segments = ringSegments(balance.flows);
  const sources = [
    ["battery", segments.battery],
    ["solar", segments.solar],
    ["grid", segments.grid],
    ["gridNonFossil", segments.nonFossil],
  ] as const;
  const [largestSource] = sources.reduce((a, b) => (a[1] > b[1] ? a : b));
  return {
    ...segments,
    largestSource,
    usageText: usageText(input, balance, individuals, format),
    plain: isDeviceOnly(input.config.entities),
  };
};
