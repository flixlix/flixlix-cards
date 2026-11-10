import { type CardLayout, type ReadyCardState } from "@flixlix-cards/shared/card-state";
import { type CardMainContext, type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { html, nothing, type TemplateResult } from "lit";
import { auxiliaryElement } from "./auxiliary";
import { batteryElement } from "./battery";
import { type FlowLayout } from "./flows/geometry";
import { flowElement } from "./flows/index";
import { gridElement } from "./grid";
import { homeElement } from "./home";
import { individualElement } from "./individual-element";
import { dashboardLinkElement } from "./misc/dashboard-link";
import { nonFossilElement } from "./non-fossil";
import { solarElement } from "./solar";
import { spacer } from "./spacer";

type RowContext = { main: CardMainContext; config: FlowCardPlusConfig; cardState: ReadyCardState };

/** The slot under solar and above the battery, where their lines cross the grid–home axis. */
const hub = html`<div class="spacer hub"></div>`;

const gridColumn = (layout: CardLayout, content: TemplateResult) =>
  layout.hasGridColumn ? content : nothing;

/** Non-fossil, solar and the top individual slots. */
const topRow = ({ main, config, cardState }: RowContext) => {
  const { nodes, individualSlots, layout, animate } = cardState;
  if (!layout.showTopRow) {
    return nothing;
  }
  const solarSlot = nodes.individuals.length > 0 ? spacer : nothing;
  return html`<div class="row">
    ${
      layout.hasGridColumn
        ? nonFossilElement(main, config, {
            nonFossil: nodes.nonFossil,
            flow: cardState.flows.nonFossil,
            animate,
          })
        : nothing
    }
    ${nodes.solar.has ? solarElement(main, config, nodes.solar) : solarSlot}
    ${individualElement(main, config, "left-top", { slot: individualSlots.leftTop, animate })}
    ${
      layout.hasRightIndividual
        ? individualElement(main, config, "right-top", { slot: individualSlots.rightTop, animate })
        : nothing
    }
  </div>`;
};

/** Grid and the home. */
const middleRow = ({ main, config, cardState }: RowContext) => {
  const { nodes, layout } = cardState;
  return html`<div class="row middle">
    ${gridColumn(layout, nodes.grid.has ? gridElement(main, config, nodes.grid, layout.showGridLabel) : spacer)}
    ${hub}
    ${
      !config.entities.home?.hide
        ? homeElement(main, config, {
            home: nodes.home,
            ring: cardState.homeRing,
            showLabel: layout.showHomeLabel,
          })
        : spacer
    }
    ${layout.hasRightIndividual ? spacer : nothing}
  </div>`;
};

/** The auxiliary node, the battery and the bottom individual slots. */
const bottomRow = ({ main, config, cardState }: RowContext) => {
  const { nodes, individualSlots, layout, animate } = cardState;
  if (!layout.showBottomRow) {
    return spacer;
  }
  return html`<div class="row">
    ${gridColumn(layout, auxiliaryElement(main, config, nodes.auxiliary))}
    ${nodes.battery.has ? batteryElement(main, config, nodes.battery) : spacer}
    ${individualElement(main, config, "left-bottom", { slot: individualSlots.leftBottom, animate })}
    ${
      layout.hasRightIndividual
        ? individualElement(main, config, "right-bottom", {
            slot: individualSlots.rightBottom,
            animate,
          })
        : nothing
    }
  </div>`;
};

/** The ready flow card: nodes in three rows around the home, the flows between them and dashboard links. */
export const flowCard = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  cardState: ReadyCardState,
  hass: HomeAssistant,
  contentId: string,
  /** Where the node circles were measured; until then the lines use a nominal layout. */
  flowLayout: FlowLayout | undefined
) => {
  const rows = { main, config, cardState };
  return html`
    <ha-card
      .header=${config.title}
      class=${config.full_size ? "full-size" : ""}
      style=${config.style_ha_card ?? ""}
    >
      <div
        class="card-content ${config.full_size ? "full-size" : ""} ${
          config.no_labels ? "no-labels" : ""
        } ${cardState.layout.hasGridColumn ? "" : "no-grid"}"
        id=${contentId}
        style="--optical-shift: ${cardState.layout.opticalShift}; ${config.style_card_content ?? ""}"
      >
        ${topRow(rows)} ${middleRow(rows)} ${bottomRow(rows)}
        ${flowElement(cardState, config, flowLayout)}
      </div>
      ${dashboardLinkElement(config, hass)}
    </ha-card>
  `;
};
