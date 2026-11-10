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

/** The line between a label's value and its name. */
export type LabelStatus = {
  /** The battery's state of charge, or its power when the two swap places; a temperature. */
  figure?: Figure;
  /** What the figure is heading for: the heat pump's target temperature. */
  target?: Figure;
  /** Colours the word: the battery's direction, or what the heat pump is doing. */
  direction?: "charging" | "discharging" | "heating" | "cooling";
  /** The direction or state in words, empty while the battery idles. */
  word: string;
};

/** One direction of a node that ran both ways, in the colour of its lane. */
export type Lane = { reading: ScaledReading; color: string };

/** What a label shows: `reading` null shows a dash. */
export type Label = {
  node: LabelledNode;
  reading: ScaledReading | null;
  /** In place of `reading`, while the node ran both ways: a value per lane, into the inverter first. */
  lanes?: Lane[];
  /** A second value on the reading's line, as large as it, after it or `first`. */
  aside?: { reading: ScaledReading; first: boolean };
  name: string;
  status?: LabelStatus;
  /** A line under the name, in the error colour: the grid's outage alert. */
  alert?: string;
  actions: ActionConfigSet;
  entity: string | undefined;
};

/** The configured car's name, entity and state of charge, which the card state does not carry. */
export type CarConfig =
  | { name?: string; entity: string; charge: number | null; idle: boolean }
  | undefined;

/**
 * The configured heat pump's name, the entity a tap opens (its climate entity, or its power
 * sensor without one) and its status line, which the card state does not carry.
 */
export type HeatPumpConfig =
  | { name?: string; entity: string; status: LabelStatus | undefined }
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
  status: (figure?: Figure) => LabelStatus | undefined
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

/** What the battery is doing now; over an energy period it may have done both. */
const batteryDirection = ({ family }: ReadyCardState, wire: HouseWire) => {
  if (family === "energy" || wire.power === 0) {
    return undefined;
  }
  return wire.intoInverter ? "discharging" : "charging";
};

/** A value per lane, or none for a node on a single wire. */
const lanesOf = (wires: HouseWire[]): Lane[] | undefined =>
  wires.length > 1 ? wires.map(({ reading, color }) => ({ reading, color })) : undefined;

/**
 * The battery's power and state of charge, placed as `position` asks; without a state of charge,
 * its power and direction as always. With a lane each way, both fill the value line, so the
 * state of charge goes under them.
 */
const batteryLabel = (
  state: ReadyCardState,
  wire: HouseWire,
  lanes: Lane[] | undefined,
  position: StateOfChargePosition | undefined,
  language: string
): Label => {
  const { battery } = state.nodes;
  const direction = batteryDirection(state, wire);
  const word = direction ? translate(`card.battery.${direction}`, language) : "";
  const status = (figure?: Figure): LabelStatus | undefined =>
    figure || direction ? { figure, direction, word } : undefined;
  const label = {
    node: "battery" as const,
    reading: wire.reading,
    name: battery.name,
    actions: battery,
    entity: battery.mainEntity,
  };
  const charge = chargeOf(battery.state_of_charge);
  if (lanes) {
    return { ...label, lanes, status: status(charge?.figure) };
  }
  return charge ? placeCharge(label, charge, position, status) : { ...label, status: status() };
};

/**
 * The grid's import or export, or a dash and its outage alert while the power is out. `alert` is
 * the grid's `power_outage.label_alert`, if set.
 */
const gridLabel = (
  { nodes }: ReadyCardState,
  wire: HouseWire,
  lanes: Lane[] | undefined,
  alert: string | undefined,
  language: string
): Label => {
  const { grid } = nodes;
  const outage = grid.powerOutage.isOutage;
  return {
    node: "grid",
    reading: outage ? null : wire.reading,
    ...(lanes ? { lanes } : {}),
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

/** The heat pump's power, with its state or its temperature under it. */
const heatPumpLabel = (
  wire: HouseWire | undefined,
  heatPump: HeatPumpConfig,
  language: string
): Label | undefined =>
  wire &&
  heatPump && {
    node: "heat_pump",
    reading: wire.reading,
    name: heatPump.name ?? translate("card.label.heat_pump", language),
    status: heatPump.status,
    // no actions of its own: a tap opens its climate entity, as clickable_entities allows
    actions: { tap_action: undefined },
    entity: heatPump.entity,
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
  batteryPosition: StateOfChargePosition | undefined,
  heatPump?: HeatPumpConfig
): Label[] => {
  const { nodes } = state;
  const wiresOf = (node: HouseNode) => wires.filter((wire) => wire.node === node);
  const wireOf = (node: HouseNode) => wiresOf(node)[0];
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
    battery && batteryLabel(state, battery, lanesOf(wiresOf("battery")), batteryPosition, language),
    grid && !generatorWire
      ? gridLabel(state, grid, lanesOf(wiresOf("grid")), gridAlert, language)
      : undefined,
    generatorWire && {
      node: "generator",
      reading: generatorWire.reading,
      name: generator?.name ?? translate("editor.entity_generator", language),
      // no actions of its own: opens more-info only with clickable_entities, like the others
      actions: { tap_action: undefined },
      entity: generator?.entity,
    },
    carLabel(carWire, car, language),
    heatPumpLabel(wireOf("heat_pump"), heatPump, language),
  ];
  return labels.filter((label): label is Label => label !== undefined);
};
