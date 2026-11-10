import { type IndividualSlot } from "@flixlix-cards/shared/card-state";
import {
  type CardMainContext,
  type FlowCardPlusConfig,
  type IndividualObject,
} from "@flixlix-cards/shared/types";
import { html, nothing, type TemplateResult } from "lit";
import { type FlowLine } from "./flows/geometry";
import { flowDot } from "./flow-dot";
import { spacer } from "./spacer";
import { type IndividualKey, individualSecondarySpan } from "./spans/individual-secondary-span";

const stateShown = (node: IndividualObject): boolean =>
  node.field?.display_zero_state !== false || (node.state ?? 0) > (node.displayZeroTolerance ?? 0);

export const isFlowing = (node: IndividualObject): boolean =>
  !!node.state && node.state >= (node.displayZeroTolerance ?? 0);

/** Icons for a dot running towards the device and away from it. */
export type DirectionArrows = { inflow: string; outflow: string };

const directionArrow = (node: IndividualObject, arrows: DirectionArrows) => {
  if (!node.showDirection) {
    return nothing;
  }
  return html`<ha-icon
    class="small"
    .icon=${node.invertAnimation ? arrows.outflow : arrows.inflow}
  ></ha-icon>`;
};

export type DeviceCircleOptions = {
  iconId: string;
  /** Classes of the value span, which pick its colour. */
  valueClass: string;
  /** Class of the secondary info span, which picks its colour. */
  secondaryClass: string;
  arrows: DirectionArrows;
};

/** An individual device's circle: secondary info, icon and value, opening its entity on click. */
export const deviceCircle = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  node: IndividualObject,
  { iconId, valueClass, secondaryClass, arrows }: DeviceCircleOptions
) => {
  const disableEntityClick = !config.clickable_entities;
  return html`<div
    class="circle ${disableEntityClick ? "pointer-events-none" : ""}"
    tabindex=${disableEntityClick ? nothing : 0}
    role=${disableEntityClick ? nothing : "button"}
    @click=${(e: MouseEvent) => {
      main.onEntityClick(e, node.field, node.entity);
    }}
    @dblclick=${(e: MouseEvent) => {
      main.onEntityDoubleClick(e, node.field, node.entity);
    }}
    @pointerdown=${(e: PointerEvent) => {
      main.onEntityPointerDown(e, node.field, node.entity);
    }}
    @pointerup=${(e: PointerEvent) => {
      main.onEntityPointerUp(e);
    }}
    @pointercancel=${(e: PointerEvent) => {
      main.onEntityPointerUp(e);
    }}
    @keydown=${(e: { key: string; stopPropagation: () => void; target: HTMLElement }) => {
      if (e.key === "Enter") {
        main.openDetails(e, node.field, node.entity, "tap");
      }
    }}
  >
    <ha-ripple .disabled=${disableEntityClick}></ha-ripple>
    ${individualSecondarySpan(main, node, secondaryClass)}
    ${node.icon !== " " ? html` <ha-icon id=${iconId} .icon=${node.icon}></ha-icon>` : nothing}
    ${
      stateShown(node)
        ? html` <span class=${valueClass}>
            ${directionArrow(node, arrows)}${node.displayState}
          </span>`
        : nothing
    }
  </div>`;
};

const INFLOW_UP: DirectionArrows = { inflow: "mdi:arrow-up", outflow: "mdi:arrow-down" };
const INFLOW_DOWN: DirectionArrows = { inflow: "mdi:arrow-down", outflow: "mdi:arrow-up" };

/** Lines into the home run down from the top slots and up from the bottom slots. */
const individualCircle = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  node: IndividualObject,
  key: IndividualKey
) => {
  const vertical = key.endsWith("top") ? "top" : "bottom";
  return deviceCircle(main, config, node, {
    iconId: `individual-${key}-icon`,
    valueClass: `individual-${vertical} individual-${key}`,
    secondaryClass: key,
    arrows: vertical === "top" ? INFLOW_UP : INFLOW_DOWN,
  });
};

type LeftKey = "left-top" | "left-bottom";
type RightKey = "right-top" | "right-bottom";

/** The left slots' lines, drawn from the device to the home inside their 80×30 boxes. */
const leftLines: Record<LeftKey, string> = {
  "left-top": "M40 -10 v50",
  "left-bottom": "M40 40 v-40",
};

const dotPaths: Record<IndividualKey, string> = {
  "left-top": "individual-top",
  "left-bottom": "individual-bottom",
  "right-top": "individual-top-right-home",
  "right-bottom": "individual-bottom-right-home",
};

/** Lines are drawn from the device to the home, so a dot flowing to the device runs in reverse. */
const individualDot = (
  slot: IndividualSlot,
  key: IndividualKey,
  animate: boolean,
  radius: number
) => {
  if (!animate || !isFlowing(slot.node)) {
    return nothing;
  }
  return flowDot({
    path: dotPaths[key],
    className: `individual-${key.endsWith("top") ? "top" : "bottom"}`,
    hostClass: key.startsWith("right") ? `individual-${key}` : "",
    durationSeconds: slot.flow.durationSeconds,
    radius,
    reverse: !slot.node.invertAnimation,
  });
};

type Parts = {
  slot: IndividualSlot;
  line: string;
  label: TemplateResult;
  circle: TemplateResult;
  dot: TemplateResult | typeof nothing;
};

/** Where label, circle and line sit for each slot around the home. */
const layouts: Record<IndividualKey, (parts: Parts) => TemplateResult> = {
  "left-top": ({ slot, line, label, circle, dot }) =>
    html`<div class="circle-container individual-top">
      ${label} ${circle}
      ${
        slot.flow.visible
          ? html`<svg width="80" height="30">
                <path d="${line}" id="individual-top" class="${slot.flow.lineClass}" />
              </svg>
              ${dot}`
          : nothing
      }
    </div>`,
  "left-bottom": ({ slot, line, label, circle, dot }) =>
    html`<div class="circle-container individual-bottom bottom">
      ${
        slot.flow.visible
          ? html`<svg width="80" height="30">
                <path d="${line}" id="individual-bottom" class="${slot.flow.lineClass}" />
              </svg>
              ${dot}`
          : html` <svg width="80" height="30"></svg> `
      }
      ${circle} ${label}
    </div>`,
  "right-top": ({ label, circle }) =>
    html`<div class="circle-container individual-top individual-right individual-right-top">
      ${label} ${circle}
    </div>`,
  "right-bottom": ({ label, circle }) =>
    html`<div class="circle-container individual-bottom individual-right individual-right-bottom">
      ${circle} ${label}
    </div>`,
};

/** The line from a right-column individual into the home; drawn in the card's flow overlay. */
export const rightIndividualFlow = (
  slot: IndividualSlot | undefined,
  key: RightKey,
  line: FlowLine | undefined,
  { animate, scale, viewBox }: { animate: boolean; scale: number; viewBox: string }
) => {
  if (!slot?.flow.visible || !line) {
    return nothing;
  }
  const id = key === "right-top" ? "individual-top-right-home" : "individual-bottom-right-home";
  return html`<svg class="flow individual-${key}" id="${id}-flow" viewBox=${viewBox}>
      <path
        id=${id}
        class="${slot.flow.lineClass}"
        d=${line.d}
        vector-effect="non-scaling-stroke"
      />
    </svg>
    ${individualDot(slot, key, animate, scale)}`;
};

/** An individual device in one of the four slots around the home, with its line to the home. */
export const individualElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  key: IndividualKey,
  { slot, animate }: { slot: IndividualSlot | undefined; animate: boolean }
) => {
  if (!slot) {
    return spacer;
  }
  // The right slots' lines are drawn in the card's flow overlay (`rightIndividualFlow`).
  const line = key === "left-top" || key === "left-bottom" ? leftLines[key] : "";
  return layouts[key]({
    slot,
    line,
    label: html`<span class="label">${slot.node.name}</span>`,
    circle: individualCircle(main, config, slot.node, key),
    dot: line ? individualDot(slot, key, animate, 1.75) : nothing,
  });
};
