import { type IndividualSlot } from "@flixlix-cards/shared/card-state";
import {
  type CardMainContext,
  type FlowCardPlusConfig,
  type IndividualObject,
} from "@flixlix-cards/shared/types";
import { html, nothing, svg, type SVGTemplateResult, type TemplateResult } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { spacer } from "./spacer";
import { type IndividualKey, individualSecondarySpan } from "./spans/individual-secondary-span";

const stateShown = (node: IndividualObject): boolean =>
  node.field?.display_zero_state !== false || (node.state ?? 0) > (node.displayZeroTolerance ?? 0);

const isFlowing = (node: IndividualObject): boolean =>
  !!node.state && node.state >= (node.displayZeroTolerance ?? 0);

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

const individualCircle = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  node: IndividualObject,
  key: IndividualKey
) => {
  const disableEntityClick = !config.clickable_entities;
  const vertical = key.endsWith("top") ? "top" : "bottom";
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
    ${individualSecondarySpan(main, node, key)}
    ${
      node.icon !== " "
        ? html` <ha-icon id="individual-${key}-icon" .icon=${node.icon}></ha-icon>`
        : nothing
    }
    ${
      stateShown(node)
        ? html` <span class="individual-${vertical} individual-${key}">
            ${directionArrow(node, key)}${node.displayState}
          </span>`
        : nothing
    }
  </div>`;
};

/** Each slot's line has its own path id, which `xlink:href` must name statically. */
const dotPaths: Record<IndividualKey, SVGTemplateResult> = {
  "left-top": svg`<mpath xlink:href="#individual-top" />`,
  "left-bottom": svg`<mpath xlink:href="#individual-bottom" />`,
  "right-top": svg`<mpath xlink:href="#individual-top-right-home" />`,
  "right-bottom": svg`<mpath xlink:href="#individual-bottom-right-home" />`,
};

const flowDot = (slot: IndividualSlot, key: IndividualKey, animate: boolean, radius = 1.75) => {
  if (!animate || !isFlowing(slot.node)) {
    return nothing;
  }
  const vertical = key.endsWith("top") ? "top" : "bottom";
  return svg`<circle r="${radius}" class="individual-${vertical}" vector-effect="non-scaling-stroke">
    <animateMotion
      dur="${slot.flow.durationSeconds}s"
      repeatCount="indefinite"
      calcMode="paced"
      keyPoints="${slot.node.invertAnimation ? "0;1" : "1;0"}"
      keyTimes="0;1"
    >
      ${dotPaths[key]}
    </animateMotion>
  </circle>`;
};

type Parts = {
  slot: IndividualSlot;
  label: TemplateResult;
  circle: TemplateResult;
  dot: SVGTemplateResult | typeof nothing;
};

/** Where label, circle and line sit for each slot around the home. */
const layouts: Record<IndividualKey, (parts: Parts) => TemplateResult> = {
  "left-top": ({ slot, label, circle, dot }) =>
    html`<div class="circle-container individual-top">
      ${label} ${circle}
      ${
        slot.flow.visible
          ? html`<svg width="80" height="30">
              <path d="M40 -10 v50" id="individual-top" class="${slot.flow.lineClass}" />
              ${dot}
            </svg>`
          : nothing
      }
    </div>`,
  "left-bottom": ({ slot, label, circle, dot }) =>
    html`<div class="circle-container individual-bottom bottom">
      ${
        slot.flow.visible
          ? html`<svg width="80" height="30">
              <path d="M40 40 v-40" id="individual-bottom" class="${slot.flow.lineClass}" />
              ${dot}
            </svg>`
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
  key: "right-top" | "right-bottom",
  d: string | undefined,
  { animate, scale, viewBox }: { animate: boolean; scale: number; viewBox: string }
) => {
  if (!slot?.flow.visible || !d) {
    return nothing;
  }
  const id = key === "right-top" ? "individual-top-right-home" : "individual-bottom-right-home";
  return html`<svg class="flow individual-${key}" id="${id}-flow" viewBox=${viewBox}>
    <path id=${id} class="${slot.flow.lineClass}" d=${d} vector-effect="non-scaling-stroke" />
    ${keyed(d, flowDot(slot, key, animate, scale))}
  </svg>`;
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
  return layouts[key]({
    slot,
    label: html`<span class="label">${slot.node.name}</span>`,
    circle: individualCircle(main, config, slot.node, key),
    dot: flowDot(slot, key, animate),
  });
};
