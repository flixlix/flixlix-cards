import { type IndividualSlot } from "@flixlix-cards/shared/card-state";
import {
  type CardMainContext,
  type FlowCardPlusConfig,
  type IndividualObject,
} from "@flixlix-cards/shared/types";
import { html, nothing, svg, type SVGTemplateResult, type TemplateResult } from "lit";
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

const flowDot = (slot: IndividualSlot, key: IndividualKey, animate: boolean) => {
  if (!animate || !isFlowing(slot.node)) {
    return nothing;
  }
  const radius = key.startsWith("left") ? 1.75 : 1;
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
  hasBottomRow: boolean;
};

const rightFlow = (path: SVGTemplateResult, dot: Parts["dot"]) =>
  html`<div class="right-individual-flow-container">
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      class="right-individual-flow"
    >
      ${path} ${dot}
    </svg>
  </div>`;

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
  "right-top": ({ slot, label, circle, dot, hasBottomRow }) =>
    html`<div class="circle-container individual-top individual-right individual-right-top">
      ${label} ${circle}
      ${
        slot.flow.visible
          ? rightFlow(
              svg`<path
                id="individual-top-right-home"
                class="${slot.flow.lineClass}"
                d="M${hasBottomRow ? 45 : 47},0 v15 c0,${
                  hasBottomRow ? "30 -10,30 -30,30" : "35 -10,35 -30,35"
                } h-20"
                vector-effect="non-scaling-stroke"
              />`,
              dot
            )
          : nothing
      }
    </div>`,
  "right-bottom": ({ slot, label, circle, dot }) =>
    html`<div class="circle-container individual-bottom individual-right individual-right-bottom">
      ${circle} ${label}
      ${
        slot.flow.visible
          ? rightFlow(
              svg`<path
                id="individual-bottom-right-home"
                class="${slot.flow.lineClass}"
                d="M45,100 v-15 c0,-30 -10,-30 -30,-30 h-20"
                vector-effect="non-scaling-stroke"
              />`,
              dot
            )
          : nothing
      }
    </div>`,
};

/** An individual device in one of the four slots around the home, with its line to the home. */
export const individualElement = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  key: IndividualKey,
  {
    slot,
    animate,
    hasBottomRow = false,
  }: { slot: IndividualSlot | undefined; animate: boolean; hasBottomRow?: boolean }
) => {
  if (!slot) {
    return spacer;
  }
  return layouts[key]({
    slot,
    label: html`<span class="label">${slot.node.name}</span>`,
    circle: individualCircle(main, config, slot.node, key),
    dot: flowDot(slot, key, animate),
    hasBottomRow,
  });
};
