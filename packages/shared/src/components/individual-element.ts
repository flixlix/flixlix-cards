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

/** What differs between a device's circle in a slot and on the orbit. */
export type CircleParts = {
  valueClass: string;
  secondaryClass: string;
  /** Id of the icon, which only the slots' lines are measured from. */
  iconId?: string;
  arrow: TemplateResult | typeof nothing;
};

/** Bottom slots point the other way: their lines run up into the home. */
const directionArrow = (node: IndividualObject, key: IndividualKey) => {
  if (!node.showDirection) {
    return nothing;
  }
  const pointsUp = key.endsWith("bottom") ? node.invertAnimation : !node.invertAnimation;
  return html`<ha-icon
    class="small"
    .icon=${pointsUp ? "mdi:arrow-up" : "mdi:arrow-down"}
  ></ha-icon>`;
};

const slotCircle = (node: IndividualObject, key: IndividualKey): CircleParts => ({
  valueClass: `individual-${key.endsWith("top") ? "top" : "bottom"} individual-${key}`,
  secondaryClass: key,
  iconId: `individual-${key}-icon`,
  arrow: directionArrow(node, key),
});

export const individualCircle = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  node: IndividualObject,
  parts: CircleParts
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
    ${individualSecondarySpan(main, node, parts.secondaryClass)}
    ${
      node.icon !== " "
        ? html` <ha-icon id=${parts.iconId ?? nothing} .icon=${node.icon}></ha-icon>`
        : nothing
    }
    ${
      stateShown(node)
        ? html` <span class=${parts.valueClass}> ${parts.arrow}${node.displayState} </span>`
        : nothing
    }
  </div>`;
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
    circle: individualCircle(main, config, slot.node, slotCircle(slot.node, key)),
    dot: line ? individualDot(slot, key, animate, 1.75) : nothing,
  });
};
