import { translate } from "@flixlix-cards/shared/i18n";
import { auxiliaryConnection, computeFlows } from "./flows";
import { formatter } from "./format";
import { computeHomeRing } from "./home-ring";
import { auxiliaryNode, individualNodes, placeIndividuals } from "./individuals";
import { batteryNode, gridNode, homeNode, nonFossilNode, solarNode } from "./nodes";
import { hasEntity, type Normalized, normalize } from "./normalize";
import { solve } from "./solve";
import { computeCssVars } from "./styles";
import { type CardState, type CardStateInput, type Flow } from "./types";

/** A battery hub without a battery has nothing to route through, so it falls back to standard. */
const activeTopology = (input: CardStateInput, { presence }: Normalized) => {
  const topology = input.config.topology ?? "standard";
  return topology === "battery_hub" && !presence.battery ? "standard" : topology;
};

/**
 * Share of the gap between the bounding-box centre and the circles' centroid that the columns
 * move. A full centroid shift reads as overcorrected for circles this far apart.
 */
export const OPTICAL_SHIFT_STRENGTH = 2 / 3;

/**
 * Two columns are centred on their circles' centroid instead of their bounding box, as a play
 * icon is centred in its button: solar and battery stacked beside a lone home look left-heavy.
 */
const opticalShift = (hubCircles: number, homeCircles: number): number => {
  const circles = hubCircles + homeCircles;
  return circles === 0 ? 0 : (0.5 - homeCircles / circles) * OPTICAL_SHIFT_STRENGTH;
};

const HIDDEN_FLOW: Flow = { value: 0, durationSeconds: 0, visible: false, lineClass: "" };

/** Everything a flow card renders, derived from its config and readings. */
export function computeCardState(input: CardStateInput): CardState {
  const { readings, config } = input;
  if (readings.status === "loading") {
    return { status: "loading" };
  }
  const format = formatter(input.hass, config, readings.family);
  const normalized = normalize(input, readings);
  const topology = activeTopology(input, normalized);
  const balance = { ...normalized, topology, flows: solve(normalized.totals, topology) };
  const context = { input, readings, balance, format };
  const nodes = {
    grid: gridNode(context),
    solar: solarNode(context),
    battery: batteryNode(context),
    home: homeNode(context, translate("editor.home", input.hass.locale?.language ?? "en")),
    nonFossil: nonFossilNode(context),
  };
  const individuals = individualNodes(input, balance, format);
  const auxiliary = auxiliaryNode(input, balance, format);
  const flows = computeFlows({
    config,
    balance,
    individuals,
    auxiliary,
    hasReturnToGrid: nodes.grid.hasReturnToGrid,
  });
  const devices = individuals.map((node, index) => ({
    node,
    flow: flows.individual[index] ?? HIDDEN_FLOW,
  }));
  const placement = placeIndividuals(input, devices);
  const visible = placement.visible.map((device) => device.node);
  const homeRing = computeHomeRing(input, balance, individuals, format);
  const animate = !config.disable_dots && !input.pageHidden;
  const { leftTop, leftBottom, rightTop, rightBottom } = placement.slots;
  const showBottomRow = nodes.battery.has || auxiliary.has || !!leftBottom || !!rightBottom;
  const hasGridColumn = hasEntity(config.entities.grid) || hasEntity(config.entities.auxiliary);
  const hasRightIndividual = !!rightTop || !!rightBottom;
  const twoColumns = !hasGridColumn && !hasRightIndividual;
  const hubCircles = Number(nodes.solar.has) + Number(nodes.battery.has);
  const homeCircles =
    Number(!config.entities.home?.hide) + Number(!!leftTop) + Number(!!leftBottom);
  return {
    status: "ready",
    family: readings.family,
    nodes: { ...nodes, individuals: visible, auxiliary },
    individualSlots: placement.slots,
    homeRing,
    homeBalance: {
      balanced: balance.flows.home,
      measured: balance.totals.measuredHome,
      unaccounted: balance.flows.unaccounted,
    },
    flows,
    animate,
    dotAnimation:
      config.dot_animation === "gpu" || config.dot_animation === "classic"
        ? config.dot_animation
        : "auto",
    cssVars: computeCssVars(
      config,
      { ...nodes, auxiliary },
      homeRing.largestSource,
      placement.sorted
    ),
    layout: {
      hasGridColumn,
      opticalShift: twoColumns ? opticalShift(hubCircles, homeCircles) : 0,
      showTopRow: nodes.solar.has || visible.length > 0 || nodes.nonFossil.hasPercentage,
      showBottomRow,
      hasRightIndividual,
      showHomeLabel: visible.length <= 1,
      showGridLabel: !(flows.auxiliary.visible && auxiliaryConnection(config) === "grid"),
    },
  };
}
