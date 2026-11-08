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
  actions: ActionConfigSet;
  entity: string | undefined;
};

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

/** One label per drawn wire but the grid's, in reading order: solar, home, battery, generator. */
export const houseLabels = (
  { nodes }: ReadyCardState,
  wires: HouseWire[],
  generator: GeneratorConfig,
  language: string
): Label[] => {
  const wireOf = (node: HouseNode) => wires.find((wire) => wire.node === node);
  const solar = wireOf("solar");
  const home = wireOf("home");
  const battery = wireOf("battery");
  const generatorWire = wireOf("generator");
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
    generatorWire && {
      node: "generator",
      reading: generatorWire.reading,
      name: generator?.name ?? translate("editor.entity_generator", language),
      // no actions of its own: opens more-info only with clickable_entities, like the others
      actions: { tap_action: undefined },
      entity: generator?.entity,
    },
  ];
  return labels.filter((label): label is Label => label !== undefined);
};
