import { type ScaledReading } from "@flixlix-cards/shared/card-state";
import { type EntityActions } from "@flixlix-cards/shared/utils/entity-actions";
import { formatNumber } from "@flixlix-cards/shared/utils/format-number";
import { type HomeAssistant, numberFormatToLocale } from "custom-card-helpers";
import { html, nothing, svg } from "lit";
import { type Box, type Extent } from "./extent";
import { type BatteryStatus, type Label } from "./labels";
import { LABEL_ANCHORS, type LabelledNode, project } from "./scene";

/** Rough size of a label in screen units, so the viewBox leaves room for it. */
const LABEL_WIDTH = 92;
const LABEL_HEIGHT = 34;
const STATUS_HEIGHT = 13;

export type LabelContext = {
  actions: EntityActions;
  clickable: boolean;
  /** Numbers roll with number-flow; otherwise they are plain text. */
  animateNumbers: boolean;
  locale: HomeAssistant["locale"];
};

/** Makes room in the viewBox for a node's label, with or without a status line. */
export const includeLabel = (extent: Extent, node: LabelledNode, hasStatus: boolean) => {
  const anchor = LABEL_ANCHORS[node];
  const [x, y] = project(anchor.at);
  const end = y + anchor.leader;
  const height = LABEL_HEIGHT + (hasStatus ? STATUS_HEIGHT : 0);
  extent.include([x, end + Math.sign(anchor.leader) * height], 4);
  extent.include([x - 10 + LABEL_WIDTH, end], 4);
};

/** The line from what a label measures up or down to the label. */
export const leaderSvg = (label: Label, extent: Extent) => {
  const anchor = LABEL_ANCHORS[label.node];
  const [x, y] = project(anchor.at);
  includeLabel(extent, label.node, label.status !== undefined);
  return svg`<g class="leader">
    <path d="M${x} ${y}V${y + anchor.leader}" stroke="var(--house-leader)" stroke-width="0.8"></path>
    <circle cx=${x} cy=${y} r="1.6" fill="var(--house-leader)"></circle>
  </g>`;
};

/** A number that rolls to its new value with number-flow, or plain text when it should not. */
const numberHtml = (value: number, decimals: number, context: LabelContext, suffix = "") =>
  context.animateNumbers
    ? html`<number-flow
        class="number"
        data-value=${value}
        .format=${{ maximumFractionDigits: decimals }}
        .numberSuffix=${suffix}
        .locales=${context.locale ? numberFormatToLocale(context.locale) : undefined}
      ></number-flow>`
    : html`<span class="number">${formatNumber(value, context.locale)}${suffix}</span>`;

/** The unit and the direction word are left empty for `morphWord` to fill. */
const valueHtml = (reading: ScaledReading | null, context: LabelContext) =>
  reading === null
    ? "—"
    : html`${numberHtml(reading.value, reading.decimals, context)}<span
          class="unit"
          data-word=${reading.unit}
        ></span>`;

const statusHtml = ({ charge, direction, word }: BatteryStatus, context: LabelContext) => html`
  ${
    charge
      ? html`<span class="state-of-charge"
          >${numberHtml(charge.value, charge.decimals, context, charge.suffix)}</span
        >`
      : nothing
  }
  ${charge && direction ? html`<span>·</span>` : nothing}
  <span class="direction ${direction ?? ""}" data-word=${word}></span>
`;

/** A label at the end of its leader, above or below its anchor. */
const labelHtml = (label: Label, position: string, context: LabelContext) => {
  const placement = LABEL_ANCHORS[label.node].leader > 0 ? "down" : "up";
  const { clickable, actions: handler } = context;
  const { actions, entity } = label;
  return html`<div
    class="label ${placement} ${clickable ? "clickable" : ""} ${label.node}"
    style=${position}
    role=${clickable ? "button" : nothing}
    tabindex=${clickable ? 0 : nothing}
    @click=${(event: MouseEvent) => handler.onEntityClick(event, actions, entity)}
    @dblclick=${(event: MouseEvent) => handler.onEntityDoubleClick(event, actions, entity)}
    @pointerdown=${(event: PointerEvent) => handler.onEntityPointerDown(event, actions, entity)}
    @pointerup=${(event: PointerEvent) => handler.onEntityPointerUp(event)}
    @pointercancel=${(event: PointerEvent) => handler.onEntityPointerUp(event)}
    @keydown=${(event: KeyboardEvent) => {
      if (event.key === "Enter" && event.target instanceof HTMLElement) {
        const { key, target } = event;
        handler.openDetails(
          { key, target, stopPropagation: () => event.stopPropagation() },
          actions,
          entity
        );
      }
    }}
  >
    <div class="value">${valueHtml(label.reading, context)}</div>
    ${label.status ? html`<div class="status">${statusHtml(label.status, context)}</div>` : nothing}
    <div class="name">${label.name}</div>
  </div>`;
};

/** The labels, laid over the scene at the ends of their leaders. */
export const labelsHtml = (labels: Label[], box: Box, context: LabelContext) =>
  html`<div class="labels">
    ${labels.map((label) => {
      const anchor = LABEL_ANCHORS[label.node];
      const [x, y] = project(anchor.at);
      const left = ((x - box.x) / box.width) * 100;
      const top = ((y + anchor.leader - box.y) / box.height) * 100;
      return labelHtml(label, `left: ${left}%; top: ${top}%`, context);
    })}
  </div>`;
