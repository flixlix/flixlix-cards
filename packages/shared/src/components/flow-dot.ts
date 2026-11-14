import { html } from "lit";

/**
 * Inline so no `svg` rule of the card's stylesheet (sizes, offsets of the line SVGs) can reach the
 * dot; `animateFlowDots` places it along its line.
 */
const DOT_STYLE =
  "position:absolute;left:0;top:0;width:1px;height:1px;margin:0;max-width:none;overflow:visible;pointer-events:none";

export type FlowDotOptions = {
  /** Id of the `<path>` the dot runs along. */
  path: string;
  /** Classes of the dot's `<circle>`, which pick its colour. */
  className: string;
  /** Classes of the dot's own `<svg>`, for colour rules that match an ancestor of the circle. */
  hostClass?: string;
  durationSeconds: number;
  /** In the line's SVG units. */
  radius?: number;
  /** Runs from the end of the path to its start. */
  reverse?: boolean;
  style?: string;
};

/**
 * A dot moving along a flow line. It is its own `<svg>` beside the line's SVG, not inside it:
 * browsers only run the motion of a top-level element on the compositor, off the main thread.
 */
export const flowDot = ({
  path,
  className,
  hostClass = "",
  durationSeconds,
  radius = 1,
  reverse = false,
  style = "",
}: FlowDotOptions) =>
  html`<svg
    class="flow-dot ${hostClass}"
    style=${style ? `${DOT_STYLE};${style}` : DOT_STYLE}
    data-path=${path}
    data-duration=${durationSeconds}
    data-radius=${radius}
    ?data-reverse=${reverse}
  >
    <circle class=${className} vector-effect="non-scaling-stroke" />
  </svg>`;
