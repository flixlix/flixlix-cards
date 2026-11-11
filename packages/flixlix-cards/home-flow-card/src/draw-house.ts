import {
  type EntityReader,
  type HouseWire,
  houseWires,
  type ReadyCardState,
} from "@flixlix-cards/shared/card-state";
import { type HomeAssistant } from "custom-card-helpers";
import { type CarScene } from "./car-node";
import { Extent } from "./extent";
import { genericPosition } from "./generic-options";
import { heatPumpScene } from "./heat-pump-node";
import { type HeatPumpConfig, houseLabels } from "./labels";
import { includeLabel, includeLabelOf, leaderSvg } from "./render-labels";
import { houseScene, includeCar } from "./render-scene";
import { HOUSE_SPAN, project, type SceneLayout } from "./scene";
import { DEFAULT_STATE_OF_CHARGE_SEVERITY, type FlowConfig } from "./types";

/** The house's middle, which the viewBox leans towards so the scene reads as centred. */
const HOUSE_MIDDLE = (project(HOUSE_SPAN[0])[0] + project(HOUSE_SPAN[1])[0]) / 2;

/**
 * Whether the card has a generator to draw. Live it runs only during an outage, which needs the
 * grid's `power_outage`; over a period it is drawn whenever it ran.
 */
const hasGenerator = (config: FlowConfig) =>
  Boolean(
    config.mode === "energy"
      ? config.generator?.entity
      : config.entities.grid?.power_outage?.entity_generator
  );

/** Where the battery's charge bar changes colour, and where its label shows the charge. */
const batteryOptions = ({ entities }: FlowConfig) => ({
  severity: entities.battery?.state_of_charge_severity ?? DEFAULT_STATE_OF_CHARGE_SEVERITY,
  position: genericPosition(entities.battery?.state_of_charge_position),
});

/** The house's labels, a label holding a value each way at the card's `two_way_value_size`. */
const labelsOf = (
  config: FlowConfig,
  cardState: ReadyCardState,
  wires: HouseWire[],
  language: string,
  car: CarScene,
  heatPump: HeatPumpConfig
) => {
  const labels = houseLabels(
    cardState,
    wires,
    config.generator,
    config.entities.grid?.power_outage?.label_alert,
    language,
    car.label,
    batteryOptions(config).position,
    heatPump
  );
  for (const label of labels) {
    if (label.lanes) {
      label.valueSize = config.two_way_value_size;
    }
  }
  return labels;
};

/**
 * The scene, its leaders and labels, and the viewBox that holds them all for labels at a scale
 * against the scene.
 */
export const drawHouse = (
  config: FlowConfig,
  cardState: ReadyCardState,
  hass: HomeAssistant,
  car: CarScene,
  read: EntityReader,
  frame?: SceneLayout
) => {
  const language = hass.locale?.language ?? "en";
  // a configured car keeps its place whether or not it is home, so the heat pump does too
  const layout: SceneLayout = frame ?? {
    car: Boolean(config.car),
    generatorBesideGrid: config.mode === "energy" && hasGenerator(config),
  };
  const heatPump = heatPumpScene(hass, config.heat_pump, read);
  const wires = houseWires(config, cardState, {
    car: car.reading,
    heatPump: heatPump.reading,
    generator: hasGenerator(config) ? read(config.generator?.entity) : undefined,
  });
  const labels = labelsOf(config, cardState, wires, language, car, heatPump.label);
  const extent = new Extent();
  const reserveGenerator = hasGenerator(config);
  const scene = houseScene({
    cardState,
    wires,
    severity: batteryOptions(config).severity,
    reserveGenerator,
    car: car.image,
    layout,
  });
  scene.include(extent);
  // the car keeps its room while it is away, so the house does not jump as it comes and goes
  if (car.reserve) {
    includeCar(extent);
  }
  const boxFor = (scale: number) => {
    const withLabels = extent.clone();
    labels.forEach((label) => includeLabelOf(withLabels, label, scale, layout));
    // the grid's and the generator's labels take turns: keep room for both, so the card keeps
    // its size as the grid goes down and comes back
    if (config.entities.grid) {
      includeLabel(withLabels, "grid", 0, { scale, layout });
    }
    if (reserveGenerator) {
      includeLabel(withLabels, "generator", 0, { scale, layout });
    }
    if (car.reserve) {
      includeLabel(withLabels, "car", 1, { scale, layout });
    }
    // centring the house costs width the larger labels of a narrow card need more
    return withLabels.viewBox(10, HOUSE_MIDDLE, Math.min(Math.max(2 - scale, 0), 1));
  };
  const leaders = labels.map((label) => leaderSvg(label, layout));
  return { labels, scene: scene.draw, leaders, boxFor, layout };
};
