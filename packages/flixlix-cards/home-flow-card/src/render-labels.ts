import { type ScaledReading } from "@flixlix-cards/shared/card-state";
import { type EntityActions } from "@flixlix-cards/shared/utils/entity-actions";
import { formatNumber } from "@flixlix-cards/shared/utils/format-number";
import { type HomeAssistant, numberFormatToLocale } from "custom-card-helpers";
import { html, nothing, svg } from "lit";
import { type Box, type Extent } from "./extent";
import { type Figure, type Label, type LabelStatus } from "./labels";
import { labelAnchor, type LabelledNode } from "./label-anchors";
import { project, type SceneLayout } from "./scene";

/** Rough size of a label in screen units, so the viewBox leaves room for it. */
const LABEL_WIDTH = 92;
const LABEL_HEIGHT = 34;
const LINE_HEIGHT = 13;
const LABEL_INDENT = 10;
/** Rough width of a second value on a label's value line, with its separator. */
const ASIDE_WIDTH = 50;

export type LabelContext = {
  layout: SceneLayout;
  actions: EntityActions;
  clickable: boolean;
  /** Numbers roll with number-flow; otherwise they are plain text. */
  animateNumbers: boolean;
  locale: HomeAssistant["locale"];
};

/**
 * Makes room in the viewBox for a node's label, with `lines` lines beyond its value and name, and
 * room for an aside on the value's line if it has one. `scale` is the label's size against the
 * scene's: labels keep a readable size as the scene shrinks, and stop growing as it grows.
 */
export const includeLabel = (
  extent: Extent,
  node: LabelledNode,
  lines: number,
  {
    aside = false,
    valueSize = 1,
    scale = 1,
    layout,
  }: { aside?: boolean; valueSize?: number; scale?: number; layout: SceneLayout }
) => {
  const anchor = labelAnchor(node, layout);
  const [x, y] = project(anchor.at);
  const end = y + anchor.leader;
  const height = (LABEL_HEIGHT + lines * LINE_HEIGHT) * scale;
  extent.include([x, end + Math.sign(anchor.leader) * height], 4);
  const valueWidth = (LABEL_WIDTH + (aside ? ASIDE_WIDTH : 0)) * valueSize;
  const width = Math.max(LABEL_WIDTH, valueWidth) * scale;
  // a label starts LABEL_INDENT left of its leader, as its CSS moves it, or ends LABEL_INDENT
  // right of it when it hangs left; the house's centring leaves room for that on a wide card, but
  // not on a narrow one
  if (anchor.side === "left") {
    // hangs into the room the house's centring leaves, so it widens the box only past it
    extent.include([x + LABEL_INDENT * scale, end], 4);
    extent.extend(x + LABEL_INDENT * scale - width, 4);
    return;
  }
  const left = x - LABEL_INDENT * scale;
  extent.require(left, 4);
  extent.include([left + width, end], 4);
};

/** Makes room in the viewBox for a drawn label, at `scale` against the scene. */
export const includeLabelOf = (extent: Extent, label: Label, scale: number, layout: SceneLayout) =>
  includeLabel(extent, label.node, [label.status, label.alert].filter(Boolean).length, {
    aside: Boolean(label.aside) || (label.lanes?.length ?? 0) > 1,
    valueSize: label.valueSize,
    scale,
    layout,
  });

/** The line from what a label measures up or down to the label. */
export const leaderSvg = (label: Label, layout: SceneLayout) => {
  const anchor = labelAnchor(label.node, layout);
  const [x, y] = project(anchor.at);
  return svg`<g class="leader">
    <path d="M${x} ${y}V${y + anchor.leader}" stroke="var(--house-leader)" stroke-width="0.8"></path>
    <circle cx=${x} cy=${y} r="1.6" fill="var(--house-leader)"></circle>
  </g>`;
};

/** A number that rolls to its new value with number-flow, or plain text when it should not. */
const numberHtml = (
  value: number,
  decimals: number,
  context: LabelContext,
  suffix = "",
  style: string | typeof nothing = nothing
) =>
  context.animateNumbers
    ? html`<number-flow
        class="number"
        style=${style}
        data-value=${value}
        .format=${{ maximumFractionDigits: decimals }}
        .numberSuffix=${suffix}
        .locales=${context.locale ? numberFormatToLocale(context.locale) : undefined}
      ></number-flow>`
    : html`<span class="number" style=${style}
        >${formatNumber(value, context.locale)}${suffix}</span
      >`;

/**
 * The unit and the direction word are left empty for `morphWord` to fill. A lane's value takes
 * its lane's colour, number and unit apart, so they stay flat in the line.
 */
const valueHtml = (reading: ScaledReading | null, context: LabelContext, color?: string) => {
  if (reading === null) {
    return "—";
  }
  const style = color ? `color: ${color}` : nothing;
  return html`${numberHtml(reading.value, reading.decimals, context, "", style)}<span
      class="unit"
      style=${style}
      data-word=${reading.unit}
    ></span>`;
};

const figureHtml = ({ value, decimals, suffix }: Figure, context: LabelContext) =>
  numberHtml(value, decimals, context, suffix);

/**
 * The value, with its aside before or after it. Both stay flat in the line, so whatever follows a
 * unit slides along with it as its number rolls.
 */
const valueLineHtml = ({ reading, aside, lanes }: Label, context: LabelContext) => {
  const separator = html`<span class="separator">·</span>`;
  if (lanes) {
    return lanes.map(
      (lane, index) =>
        html`${index > 0 ? separator : nothing}${valueHtml(lane.reading, context, lane.color)}`
    );
  }
  const value = valueHtml(reading, context);
  if (!aside) {
    return value;
  }
  const second = valueHtml(aside.reading, context);
  return aside.first ? html`${second}${separator}${value}` : html`${value}${separator}${second}`;
};

const statusHtml = (
  { figure, target, direction, word }: LabelStatus,
  context: LabelContext
) => html`
  ${figure ? html`<span class="figure">${figureHtml(figure, context)}</span>` : nothing}
  ${
    target
      ? html`<span>→</span><span class="figure">${figureHtml(target, context)}</span>`
      : nothing
  }
  ${figure && direction ? html`<span>·</span>` : nothing}
  <span class="direction ${direction ?? ""}" data-word=${word}></span>
`;

/** A label at the end of its leader, above or below its anchor. */
const labelHtml = (label: Label, position: string, context: LabelContext) => {
  const anchor = labelAnchor(label.node, context.layout);
  const placement = `${anchor.leader > 0 ? "down" : "up"}${anchor.side === "left" ? " left" : ""}`;
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
    <div
      class="value"
      style=${label.valueSize === undefined ? nothing : `--value-size: ${label.valueSize}`}
    >
      ${valueLineHtml(label, context)}
    </div>
    ${label.status ? html`<div class="status">${statusHtml(label.status, context)}</div>` : nothing}
    <div class="name">${label.name}</div>
    ${label.alert ? html`<div class="name outage">${label.alert}</div>` : nothing}
  </div>`;
};

/** The labels, laid over the scene at the ends of their leaders. */
export const labelsHtml = (labels: Label[], box: Box, context: LabelContext) =>
  html`<div class="labels">
    ${labels.map((label) => {
      const anchor = labelAnchor(label.node, context.layout);
      const [x, y] = project(anchor.at);
      const left = ((x - box.x) / box.width) * 100;
      const top = ((y + anchor.leader - box.y) / box.height) * 100;
      return labelHtml(label, `left: ${left}%; top: ${top}%`, context);
    })}
  </div>`;
