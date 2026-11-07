import { translate } from "@flixlix-cards/shared/i18n";
import { getEntityState } from "@flixlix-cards/shared/states/utils/get-entity-state";
import { type ConfigEntities } from "@flixlix-cards/shared/types";
import { split } from "./distribution";
import { animationRescale, computeFlows } from "./flows";
import { formatter } from "./format";
import { computeHomeRing } from "./home-ring";
import { individualNodes, placeIndividuals } from "./individuals";
import {
  batteryNode,
  gridNode,
  homeNode,
  isOutage,
  nonFossilNode,
  type Settled,
  solarNode,
} from "./nodes";
import { computeCssVars } from "./styles";
import { adjustZeroTolerance } from "./tolerance";
import { type CardState, type CardStateInput, type Flow, type ReadyReadings } from "./types";

const HIDDEN_FLOW: Flow = { value: 0, durationSeconds: 0, visible: false, lineClass: "" };

const hasBatteryEntity = (battery: ConfigEntities["battery"]): boolean => {
  const entity = battery?.entity;
  return typeof entity === "object" ? !!(entity.consumption || entity.production) : !!entity;
};

/** Whether part of the (untolerated) grid import is non-fossil. */
const hasNonFossil = (input: CardStateInput, fromGrid: number | null, fossilPercentage: number) => {
  const fossil = input.config.entities.fossil_fuel_percentage;
  if (fossil?.entity === undefined) {
    return false;
  }
  if (fossil.display_zero === true) {
    return true;
  }
  return fromGrid !== null && fromGrid * (1 - fossilPercentage / 100) > 0;
};

type ToleratedTotals = {
  fromGrid: number;
  toGrid: number;
  solarTotal: number;
  toBattery: number;
  fromBattery: number;
};

const toleratedTotals = (entities: ConfigEntities, readings: ReadyReadings): ToleratedTotals => {
  const gridTolerance = entities.grid?.display_zero_tolerance;
  const batteryTolerance = entities.battery?.display_zero_tolerance;
  return {
    fromGrid: adjustZeroTolerance(readings.grid.fromGrid, gridTolerance),
    toGrid: adjustZeroTolerance(readings.grid.toGrid, gridTolerance),
    solarTotal: adjustZeroTolerance(readings.solar.total, entities.solar?.display_zero_tolerance),
    toBattery: adjustZeroTolerance(readings.battery.toBattery, batteryTolerance),
    fromBattery: adjustZeroTolerance(readings.battery.fromBattery, batteryTolerance),
  };
};

/** Which nodes are shown, honouring display_zero. */
const nodePresence = (
  entities: ConfigEntities,
  readings: ReadyReadings,
  totals: ToleratedTotals
): Settled["has"] => ({
  grid:
    entities.grid?.entity !== undefined &&
    !(entities.grid.display_zero === false && totals.fromGrid === 0 && totals.toGrid === 0),
  solar:
    entities.solar?.entity !== undefined &&
    (entities.solar.display_zero !== false || (readings.solar.total ?? 0) > 0),
  battery:
    hasBatteryEntity(entities.battery) &&
    !(
      entities.battery?.display_zero === false &&
      totals.fromBattery === 0 &&
      totals.toBattery === 0
    ),
});

const splitTolerance = (entities: ConfigEntities) => ({
  grid: entities.grid?.display_zero_tolerance ?? 0,
  battery: entities.battery?.display_zero_tolerance ?? 0,
  solar: entities.solar?.display_zero_tolerance ?? 0,
});

/** Applies zero tolerance and display_zero, then splits the totals into flows. */
const settle = (input: CardStateInput, readings: ReadyReadings): Settled => {
  const { entities } = input.config;
  const totals = toleratedTotals(entities, readings);
  const { solarTotal, toBattery, fromBattery } = totals;
  const has = nodePresence(entities, readings, totals);
  const fossilEntity = entities.fossil_fuel_percentage?.entity;
  const fossilPercentage =
    fossilEntity === undefined ? 0 : (getEntityState(input.hass, fossilEntity) ?? 0);
  const outage = isOutage(input.hass, entities);
  const flows = split(readings.family, {
    ...totals,
    outage,
    fossilPercentage,
    solarHas: has.solar,
    batteryHas: has.battery,
    tolerance: splitTolerance(entities),
    generator: readings.generator ?? 0,
    nonFossilHas: hasNonFossil(input, readings.grid.fromGrid, fossilPercentage),
    fossilEnergyConsumption: readings.fossilEnergyConsumption,
  });
  const settled = { ...flows, has, outage, solarTotal, toBattery, fromBattery };
  if (has.grid) {
    return settled;
  }
  return {
    ...settled,
    fromGrid: 0,
    toGrid: 0,
    gridToHome: 0,
    gridToBattery: 0,
    solarToGrid: 0,
    batteryToGrid: 0,
    nonFossilHas: false,
    nonFossilPower: 0,
  };
};

/**
 * Everything a flow card renders, derived from its config and readings. `previous` is the state
 * the card rendered last, used to keep running dot animations in place when their pace changes.
 */
export function computeCardState(input: CardStateInput, previous?: CardState): CardState {
  const { readings, config } = input;
  if (readings.status === "loading") {
    return { status: "loading" };
  }
  const format = formatter(input.hass, config, readings.family);
  const settled = settle(input, readings);
  const context = { input, readings, settled, format };
  const nodes = {
    grid: gridNode(context),
    solar: solarNode(context),
    battery: batteryNode(context),
    home: homeNode(context, translate("editor.home", input.hass.locale?.language ?? "en")),
    nonFossil: nonFossilNode(context),
  };
  const individuals = individualNodes(input, readings.individuals, format);
  const flows = computeFlows({
    config,
    settled,
    individuals,
    hasReturnToGrid: nodes.grid.hasReturnToGrid,
  });
  const devices = individuals.map((node, index) => ({
    node,
    flow: flows.individual[index] ?? HIDDEN_FLOW,
  }));
  const placement = placeIndividuals(input, devices);
  const visible = placement.visible.map((device) => device.node);
  const homeRing = computeHomeRing(input, readings, settled, individuals, format);
  const animate = !config.disable_dots && !input.pageHidden;
  const { leftBottom, rightTop, rightBottom } = placement.slots;
  const showBottomRow = nodes.battery.has || !!leftBottom || !!rightBottom;
  return {
    status: "ready",
    nodes: { ...nodes, individuals: visible },
    individualSlots: placement.slots,
    homeRing,
    flows,
    animate,
    animationRescale: animationRescale(flows, animate, previous),
    cssVars: computeCssVars(config, nodes, homeRing.largestSource, placement.sorted, input.width),
    layout: {
      showTopRow: nodes.solar.has || visible.length > 0 || nodes.nonFossil.hasPercentage,
      showBottomRow,
      hasRightIndividual: !!rightTop || !!rightBottom,
      showHomeLabel: visible.length <= 1,
    },
  };
}
