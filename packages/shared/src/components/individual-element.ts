import { type IndividualSlot } from "@flixlix-cards/shared/card-state";
import {
  type CardMainContext,
  type FlowCardPlusConfig,
  type IndividualObject,
} from "@flixlix-cards/shared/types";
import { html, nothing, svg, type SVGTemplateResult, type TemplateResult } from "lit";
import { reversePath } from "./reverse-path";
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

/** Each slot's line, drawn from the device to the home. */
const linePaths: Record<IndividualKey, (hasBottomRow: boolean) => string> = {
  "left-top": () => "M40 -10 v50",
  "left-bottom": () => "M40 40 v-40",
  "right-top": (hasBottomRow) =>
    hasBottomRow ? "M45,0 v15 c0,30 -10,30 -30,30 h-20" : "M47,0 v15 c0,35 -10,35 -30,35 h-20",
  "right-bottom": () => "M45,100 v-15 c0,-30 -10,-30 -30,-30 h-20",
};

/**
 * The dot runs along the line drawn in its direction of travel instead of using `keyPoints`:
 * older Chromium ignores `keyPoints` with `calcMode="paced"`, and `linear` speeds up on straight parts.
 */
const flowDot = (slot: IndividualSlot, key: IndividualKey, animate: boolean, line: string) => {
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
      path="${slot.node.invertAnimation ? line : reversePath(line)}"
    ></animateMotion>
  </circle>`;
};

type Parts = {
  slot: IndividualSlot;
  line: string;
  label: TemplateResult;
  circle: TemplateResult;
  dot: SVGTemplateResult | typeof nothing;
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
  "left-top": ({ slot, line, label, circle, dot }) =>
    html`<div class="circle-container individual-top">
      ${label} ${circle}
      ${
        slot.flow.visible
          ? html`<svg width="80" height="30">
              <path d="${line}" id="individual-top" class="${slot.flow.lineClass}" />
              ${dot}
            </svg>`
          : nothing
      }
    </div>`,
  "left-bottom": ({ slot, line, label, circle, dot }) =>
    html`<div class="circle-container individual-bottom bottom">
      ${
        slot.flow.visible
          ? html`<svg width="80" height="30">
              <path d="${line}" id="individual-bottom" class="${slot.flow.lineClass}" />
              ${dot}
            </svg>`
          : html` <svg width="80" height="30"></svg> `
      }
      ${circle} ${label}
    </div>`,
  "right-top": ({ slot, line, label, circle, dot }) =>
    html`<div class="circle-container individual-top individual-right individual-right-top">
      ${label} ${circle}
      ${
        slot.flow.visible
          ? rightFlow(
              svg`<path
                id="individual-top-right-home"
                class="${slot.flow.lineClass}"
                d="${line}"
                vector-effect="non-scaling-stroke"
              />`,
              dot
            )
          : nothing
      }
    </div>`,
  "right-bottom": ({ slot, line, label, circle, dot }) =>
    html`<div class="circle-container individual-bottom individual-right individual-right-bottom">
      ${circle} ${label}
      ${
        slot.flow.visible
          ? rightFlow(
              svg`<path
                id="individual-bottom-right-home"
                class="${slot.flow.lineClass}"
                d="${line}"
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
  const line = linePaths[key](hasBottomRow);
  return layouts[key]({
    slot,
    line,
    label: html`<span class="label">${slot.node.name}</span>`,
    circle: individualCircle(main, config, slot.node, key),
    dot: flowDot(slot, key, animate, line),
  });
};
