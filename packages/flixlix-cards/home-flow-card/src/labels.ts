import {
  type HouseNode,
  type HouseWire,
  type ReadyCardState,
  type ScaledReading,
} from "@flixlix-cards/shared/card-state";
import { translate } from "@flixlix-cards/shared/i18n";
import { type ActionConfigSet, type BatteryObject } from "@flixlix-cards/shared/types";
import { type LabelledNode } from "./scene";

/** The battery's line between its value and its name. */
export type BatteryStatus = {
  /** The state of charge with its unit, when the battery reports one. */
  charge?: { value: number; decimals: number; suffix: string };
  direction?: "charging" | "discharging";
  /** The direction in words, empty while the battery idles. */
  word: string;
};

/** What a label shows: `reading` null shows a dash. */
export type Label = {
  node: LabelledNode;
  reading: ScaledReading | null;
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

const batteryStatus = (
  wire: HouseWire,
  soc: BatteryObject["state_of_charge"],
  language: string
): BatteryStatus | undefined => {
  const direction = wire.power > 0 ? (wire.intoInverter ? "discharging" : "charging") : undefined;
  const charge =
    typeof soc.state === "number"
      ? {
          value: soc.state,
          decimals: soc.decimals,
          suffix: `${soc.unit_white_space ? " " : ""}${soc.unit}`,
        }
      : undefined;
  if (!charge && !direction) {
    return undefined;
  }
  const word = direction ? translate(`card.battery.${direction}`, language) : "";
  return { charge, direction, word };
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

/** The car's power, with its state of charge and whether it charges, like the battery's. */
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
      status: batteryStatus(
        wire,
        { state: car.charge, unit: "%", unit_white_space: true, decimals: 0 },
        language
      ),
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
  car?: CarConfig
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
    battery && {
      node: "battery",
      reading: battery.reading,
      name: nodes.battery.name,
      status: batteryStatus(battery, nodes.battery.state_of_charge, language),
      actions: nodes.battery,
      entity: nodes.battery.mainEntity,
    },
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
