import { ORBIT_NODE_SIZE, type ReadyCardState } from "@flixlix-cards/shared/card-state";
import { type CardMainContext, type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { html, nothing } from "lit";
import { flowDot } from "./flow-dot";
import { type Ring, straightLine } from "./flows/geometry";
import { homeElement } from "./home";
import { individualCircle, isFlowing } from "./individual-element";

type OrbitState = NonNullable<ReadyCardState["orbit"]>;
type OrbitDevice = OrbitState["devices"][number];

/** Flow dots have a radius of 1.75px: a dot of `--dot-size`, 3.5px across. */
const DOT_RADIUS = 1.75;

const half = ORBIT_NODE_SIZE / 2;

/** One device's line from the home to its circle, drawn in the orbit box's pixels. */
const deviceFlow = (
  device: OrbitDevice,
  position: number,
  {
    home,
    scale,
    viewBox,
    animate,
  }: { home: Ring; scale: number; viewBox: string; animate: boolean }
) => {
  if (!device.flow.visible) {
    return nothing;
  }
  const line = straightLine(home, { cx: device.x, cy: device.y, r: half * scale });
  const id = `orbit-line-${position}`;
  const dot =
    animate && isFlowing(device.node)
      ? flowDot({
          path: id,
          className: "orbit-dot",
          durationSeconds: device.flow.durationSeconds,
          radius: DOT_RADIUS,
          // Lines are drawn from the home out, the way a device draws power.
          reverse: device.node.invertAnimation,
          style: device.style,
        })
      : nothing;
  return html`<svg class="flow orbit-line" style=${device.style} viewBox=${viewBox}>
      <path
        id=${id}
        class=${device.flow.lineClass}
        d=${line.d}
        vector-effect="non-scaling-stroke"
      />
    </svg>
    ${dot}`;
};

const deviceNode = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  device: OrbitDevice,
  scale: number
) =>
  html`<div
    class="orbit-node orbit-device"
    style="left:${device.x - half}px;top:${device.y - half}px;transform:scale(${scale});${device.style}"
  >
    <div class="circle-container">
      ${individualCircle(main, config, device.node, "orbit")}
      <span class="label">${device.node.name}</span>
    </div>
  </div>`;

/**
 * The home in the middle and every individual device on a ring around it, joined to the home by
 * straight lines. Used when the card has no grid, solar or battery. Everything sits in a box of
 * fixed pixels, so the lines meet the circles without measuring the rendered card.
 */
export const orbitContent = (
  main: CardMainContext,
  config: FlowCardPlusConfig,
  cardState: ReadyCardState,
  orbit: OrbitState
) => {
  const { geometry, devices } = orbit;
  const { width, height, scale, fit } = geometry;
  const home: Ring = { cx: geometry.home.x, cy: geometry.home.y, r: half };
  const viewBox = `0 0 ${width} ${height}`;
  const flowContext = { home, scale, viewBox, animate: cardState.animate };
  return html`<div class="orbit-frame" style="width:${width * fit}px;height:${height * fit}px">
    <div class="orbit" style="width:${width}px;height:${height}px;transform:scale(${fit})">
      <div class="flows" aria-hidden="true">
        ${devices.map((device, position) => deviceFlow(device, position, flowContext))}
      </div>
      ${
        !config.entities.home?.hide
          ? html`<div
              class="orbit-node orbit-home"
              style="left:${home.cx - half}px;top:${home.cy - half}px"
            >
              ${homeElement(main, config, {
                home: cardState.nodes.home,
                ring: cardState.homeRing,
                showLabel: cardState.layout.showHomeLabel,
              })}
            </div>`
          : nothing
      }
      ${devices.map((device) => deviceNode(main, config, device, scale))}
    </div>
  </div>`;
};
