import {
  type HouseNode,
  type HouseWire,
  type ReadyCardState,
  type ScaledReading,
} from "@flixlix-cards/shared/card-state";
import { translate } from "@flixlix-cards/shared/i18n";
import { type ActionConfigSet, type BatteryObject } from "@flixlix-cards/shared/types";
import { type LabelledNode } from "./scene";
import { type StateOfChargePosition } from "./types";

/** A number with its unit glued on, as the status line shows it. */
export type Figure = { value: number; decimals: number; suffix: string };

/** The battery's line between its value and its name. */
export type BatteryStatus = {
  /** The state of charge, or the power when the two swap places. */
  figure?: Figure;
  direction?: "charging" | "discharging";
  /** The direction in words, empty while the battery idles. */
  word: string;
};

/** What a label shows: `reading` null shows a dash. */
export type Label = {
  node: LabelledNode;
  reading: ScaledReading | null;
  /** A second value on the reading's line, as large as it, after it or `first`. */
  aside?: { reading: ScaledReading; first: boolean };
  name: string;
  status?: BatteryStatus;
  /** A line under the name, in the error colour: the grid's outage alert. */
  alert?: string;
  actions: ActionConfigSet;
  entity: string | undefined;
};

/** The configured car's name, entity and state of charge, which the card state does not carry. */
export type CarConfig =
  | { name?: string; entity: string; charge: number | null; idle: boolean }
  | undefined;

/** The configured generator's name and entity, which the card state does not carry. */
export type GeneratorConfig = { name?: string; entity: string } | undefined;

const figureOf = ({ value, decimals, unit }: ScaledReading): Figure => ({
  value,
  decimals,
  suffix: ` ${unit}`,
});

/** The state of charge as a figure, and as a reading with its unit apart; none without a number. */
const chargeOf = ({ state, unit, decimals, unit_white_space }: BatteryObject["state_of_charge"]) =>
  typeof state === "number"
    ? {
        figure: { value: state, decimals, suffix: `${unit_white_space ? " " : ""}${unit}` },
        reading: { value: state, unit, decimals },
      }
    : undefined;

type Charge = NonNullable<ReturnType<typeof chargeOf>>;

/** Places the state of charge relative to the power, `below_power` unless set otherwise. */
const placeCharge = (
  label: Label & { reading: ScaledReading },
  charge: Charge,
  position: StateOfChargePosition | undefined,
  status: (figure?: Figure) => BatteryStatus | undefined
): Label => {
  switch (position) {
    case "above_power":
      return { ...label, reading: charge.reading, status: status(figureOf(label.reading)) };
    case "after_power":
    case "before_power":
      return {
        ...label,
        aside: { reading: charge.reading, first: position === "before_power" },
        status: status(),
      };
    case "below_power":
    case undefined:
    default:
      return { ...label, status: status(charge.figure) };
  }
};

/**
 * The battery's power and state of charge, placed as `position` asks; without a state of charge,
 * its power and direction as always.
 */
const batteryLabel = (
  { nodes }: ReadyCardState,
  wire: HouseWire,
  position: StateOfChargePosition | undefined,
  language: string
): Label => {
  const { battery } = nodes;
  const direction = wire.power > 0 ? (wire.intoInverter ? "discharging" : "charging") : undefined;
  const word = direction ? translate(`card.battery.${direction}`, language) : "";
  const status = (figure?: Figure): BatteryStatus | undefined =>
    figure || direction ? { figure, direction, word } : undefined;
  const label = {
    node: "battery" as const,
    reading: wire.reading,
    name: battery.name,
    actions: battery,
    entity: battery.mainEntity,
  };
  const charge = chargeOf(battery.state_of_charge);
  return charge ? placeCharge(label, charge, position, status) : { ...label, status: status() };
};

/**
 * The grid's import or export, or a dash and its outage alert while the power is out. `alert` is
 * the grid's `power_outage.label_alert`, if set.
 */
const gridLabel = (
  { nodes }: ReadyCardState,
  wire: HouseWire,
  alert: string | undefined,
  language: string
): Label => {
  const { grid } = nodes;
  const outage = grid.powerOutage.isOutage;
  return {
    node: "grid",
    reading: outage ? null : wire.reading,
    name: grid.name,
    alert: outage ? (alert ?? translate("editor.power_outage", language)) : undefined,
    actions: grid,
    entity: grid.mainEntity,
  };
};

/** An idle car's label: its state of charge as its value, or a dash without one. */
const idleCarLabel = (car: NonNullable<CarConfig>, language: string): Label => ({
  node: "car",
  reading: car.charge === null ? null : { value: car.charge, unit: "%", decimals: 0 },
  name: car.name ?? translate("card.label.car", language),
  actions: { tap_action: undefined },
  entity: car.entity,
});

/** The car's power, with its state of charge under it. */
const carLabel = (
  wire: HouseWire | undefined,
  car: CarConfig,
  language: string
): Label | undefined => {
  if (car?.idle) {
    return idleCarLabel(car, language);
  }
  return (
    wire &&
    car && {
      ...idleCarLabel(car, language),
      reading: wire.reading,
      // only its state of charge: "charging" and its colours belong to the battery
      status:
        car.charge === null
          ? undefined
          : { figure: { value: car.charge, decimals: 0, suffix: " %" }, word: "" },
    }
  );
};

/**
 * One label per drawn wire, in reading order: solar, home, battery, then the grid or the
 * generator. They share their place: the grid's label shows whenever the generator isn't drawn.
 */
export const houseLabels = (
  state: ReadyCardState,
  wires: HouseWire[],
  generator: GeneratorConfig,
  gridAlert: string | undefined,
  language: string,
  car: CarConfig,
  batteryPosition: StateOfChargePosition | undefined
): Label[] => {
  const { nodes } = state;
  const wireOf = (node: HouseNode) => wires.find((wire) => wire.node === node);
  const solar = wireOf("solar");
  const home = wireOf("home");
  const battery = wireOf("battery");
  const grid = wireOf("grid");
  const generatorWire = wireOf("generator");
  const carWire = wireOf("car");
  const labels: (Label | undefined)[] = [
    solar && {
      node: "solar",
      reading: solar.reading,
      name: nodes.solar.name,
      actions: nodes.solar,
      entity: nodes.solar.entity,
    },
    home && {
      node: "home",
      reading: home.reading,
      name: nodes.home.name,
      actions: nodes.home,
      entity: nodes.home.entity,
    },
    battery && batteryLabel(state, battery, batteryPosition, language),
    grid && !generatorWire ? gridLabel(state, grid, gridAlert, language) : undefined,
    generatorWire && {
      node: "generator",
      reading: generatorWire.reading,
      name: generator?.name ?? translate("editor.entity_generator", language),
      // no actions of its own: opens more-info only with clickable_entities, like the others
      actions: { tap_action: undefined },
      entity: generator?.entity,
    },
    carLabel(carWire, car, language),
  ];
  return labels.filter((label): label is Label => label !== undefined);
};
