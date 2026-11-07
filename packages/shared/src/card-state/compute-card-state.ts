import { translate } from "@flixlix-cards/shared/i18n";
import { animationRescale, computeFlows } from "./flows";
import { formatter } from "./format";
import { computeHomeRing } from "./home-ring";
import { individualNodes, placeIndividuals } from "./individuals";
import { batteryNode, gridNode, homeNode, nonFossilNode, solarNode } from "./nodes";
import { normalize } from "./normalize";
import { solve } from "./solve";
import { computeCssVars } from "./styles";
import { type CardState, type CardStateInput, type Flow } from "./types";

const HIDDEN_FLOW: Flow = { value: 0, durationSeconds: 0, visible: false, lineClass: "" };

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
  const individuals = individualNodes(input, balance.totals, balance.presence, format);
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
  const placement = placeIndividuals(input, devices);
  const visible = placement.visible.map((device) => device.node);
  const homeRing = computeHomeRing(input, balance, individuals, format);
  const animate = !config.disable_dots && !input.pageHidden;
  const { leftBottom, rightTop, rightBottom } = placement.slots;
  const showBottomRow = nodes.battery.has || !!leftBottom || !!rightBottom;
  return {
    status: "ready",
    nodes: { ...nodes, individuals: visible },
    individualSlots: placement.slots,
    homeRing,
    homeBalance: {
      balanced: balance.flows.home,
      measured: balance.totals.measuredHome,
      unaccounted: balance.flows.unaccounted,
    },
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
