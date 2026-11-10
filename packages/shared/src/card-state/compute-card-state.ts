import { translate } from "@flixlix-cards/shared/i18n";
import { isDeviceOnly } from "@flixlix-cards/shared/utils/flow-card-config";
import { computeFlows } from "./flows";
import { formatter } from "./format";
import { computeHomeRing } from "./home-ring";
import { individualNodes, placeIndividuals } from "./individuals";
import { batteryNode, gridNode, homeNode, nonFossilNode, solarNode } from "./nodes";
import { normalize } from "./normalize";
import { computeOrbit } from "./orbit-state";
import { solve } from "./solve";
import { computeCssVars } from "./styles";
import { type CardState, type CardStateInput, type Flow } from "./types";

const HIDDEN_FLOW: Flow = { value: 0, durationSeconds: 0, visible: false, lineClass: "" };

/** Everything a flow card renders, derived from its config and readings. */
export function computeCardState(input: CardStateInput): CardState {
  const { readings, config } = input;
  if (readings.status === "loading") {
    return { status: "loading" };
  }
  const format = formatter(input.hass, config, readings.family);
  const normalized = normalize(input, readings);
  const balance = { ...normalized, flows: solve(normalized.totals) };
  const context = { input, readings, balance, format };
  const nodes = {
    grid: gridNode(context),
    solar: solarNode(context),
    battery: batteryNode(context),
    home: homeNode(context, translate("editor.home", input.hass.locale?.language ?? "en")),
    nonFossil: nonFossilNode(context),
  };
  const individuals = individualNodes(input, balance, format);
  const flows = computeFlows({
    config,
    balance,
    individuals,
    hasReturnToGrid: nodes.grid.hasReturnToGrid,
  });
  const devices = individuals.map((node, index) => ({
    node,
    flow: flows.individual[index] ?? HIDDEN_FLOW,
  }));
  const deviceOnly = isDeviceOnly(config.entities);
  const placement = placeIndividuals(input, devices, { orbit: deviceOnly });
  const visible = placement.visible.map((device) => device.node);
  const homeRing = computeHomeRing(input, balance, individuals, format);
  const animate = !config.disable_dots && !input.pageHidden;
  const { leftBottom, rightTop, rightBottom } = placement.slots;
  const showBottomRow = nodes.battery.has || !!leftBottom || !!rightBottom;
  return {
    status: "ready",
    nodes: { ...nodes, individuals: visible },
    orbit: deviceOnly ? computeOrbit(input.width, placement.visible, individuals) : undefined,
    individualSlots: placement.slots,
    homeRing,
    homeBalance: {
      balanced: balance.flows.home,
      measured: balance.totals.measuredHome,
      unaccounted: balance.flows.unaccounted,
    },
    flows,
    animate,
    cssVars: computeCssVars(config, nodes, homeRing.largestSource, placement.sorted),
    layout: {
      showTopRow: nodes.solar.has || visible.length > 0 || nodes.nonFossil.hasPercentage,
      showBottomRow,
      hasRightIndividual: !!rightTop || !!rightBottom,
      showHomeLabel: visible.length <= 1,
    },
  };
}
