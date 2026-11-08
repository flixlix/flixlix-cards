import { css } from "lit";

/**
 * The house is drawn in greys derived from the theme's card background and text colours, shaded
 * by mixing in black so the light falls the same way in light and dark themes. Browsers without
 * `color-mix` (older wall panels) get a fixed light palette.
 */
export const styles = css`
  :host {
    --house-wall-top: #eceef1;
    --house-wall: #e5e6ea;
    --house-gable-top: #dcdde1;
    --house-gable: #d3d4d9;
    --house-roof: #d3d5da;
    --house-roof-back: #c8cad0;
    --house-fascia: #ebecef;
    --house-panel-top: #a9adb5;
    --house-panel: #9da1aa;
    --house-panel-seam: #eef0f3;
    --house-box-top: #ffffff;
    --house-box-front-top: #ffffff;
    --house-box-front: #f3f4f6;
    --house-box-side: #e1e2e6;
    --house-icon: #8a8e96;
    --house-soc-track: #e1e2e6;
    --house-soc: #3fc28a;
    --house-soc-low: var(--error-color, #db4437);
    --house-wire: #ffffff;
    --house-wire-edge: #d8dade;
    --house-ground: #eceef1;
    --house-shadow: rgba(60, 65, 80, 0.22);
    --house-leader: #9a9ea6;
    --house-sun: #ffcf8f;
    display: block;
  }

  @supports (color: color-mix(in srgb, red, blue)) {
    :host {
      --house-surface: color-mix(
        in srgb,
        var(--primary-text-color, #212121) 7%,
        var(--card-background-color, #fff)
      );
      --house-wall-top: var(--house-surface);
      --house-wall: color-mix(in srgb, #000 3%, var(--house-surface));
      --house-gable-top: color-mix(in srgb, #000 6%, var(--house-surface));
      --house-gable: color-mix(in srgb, #000 9%, var(--house-surface));
      --house-roof: color-mix(in srgb, #000 9%, var(--house-surface));
      --house-roof-back: color-mix(in srgb, #000 14%, var(--house-surface));
      --house-fascia: color-mix(in srgb, #fff 30%, var(--house-surface));
      --house-panel-top: color-mix(in srgb, #000 27%, var(--house-surface));
      --house-panel: color-mix(in srgb, #000 32%, var(--house-surface));
      --house-panel-seam: color-mix(in srgb, #fff 40%, var(--house-panel));
      --house-box-top: color-mix(in srgb, #fff 70%, var(--house-surface));
      --house-box-front-top: color-mix(in srgb, #fff 60%, var(--house-surface));
      --house-box-front: color-mix(in srgb, #fff 45%, var(--house-surface));
      --house-box-side: color-mix(in srgb, #000 4%, var(--house-surface));
      --house-icon: var(--secondary-text-color, #8a8e96);
      --house-soc-track: color-mix(in srgb, #000 8%, var(--house-surface));
      --house-wire: color-mix(in srgb, #fff 75%, var(--house-surface));
      --house-wire-edge: color-mix(in srgb, #000 12%, var(--house-surface));
      --house-ground: var(--house-surface);
      --house-leader: color-mix(in srgb, var(--secondary-text-color, #727272) 75%, transparent);
    }

    /* A dark card needs a stronger tint for the walls to stand off it. */
    :host([dark]) {
      --house-surface: color-mix(
        in srgb,
        var(--primary-text-color, #e1e1e1) 16%,
        var(--card-background-color, #1c1c1c)
      );
      --house-panel-seam: color-mix(in srgb, #fff 22%, var(--house-panel));
      --house-shadow: rgba(0, 0, 0, 0.5);
    }
  }

  ha-card {
    overflow: hidden;
  }

  .stage {
    position: relative;
    padding: 8px 4px 4px;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
  }

  .pulse {
    fill: none;
    stroke-linecap: round;
    stroke-dasharray: 16 54;
    animation: pulse linear infinite;
  }

  @keyframes pulse {
    to {
      stroke-dashoffset: -70;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pulse {
      display: none;
    }
  }

  .labels {
    position: absolute;
    inset: 8px 4px 4px;
    pointer-events: none;
  }

  .label {
    position: absolute;
    white-space: nowrap;
    line-height: 1.05;
    color: var(--primary-text-color);
    pointer-events: auto;
    transform: translate(calc(var(--house-unit, 1px) * -10), -100%);
  }

  .label.down {
    transform: translate(calc(var(--house-unit, 1px) * -10), 0);
  }

  .label.clickable {
    cursor: pointer;
  }

  .label:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    border-radius: 4px;
  }

  .value {
    font-size: calc(var(--house-unit, 1px) * 17);
    font-weight: 700;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }

  .unit {
    font-size: 0.58em;
    margin-left: 0.15em;
    letter-spacing: 0;
  }

  number-flow {
    --number-flow-mask-height: 0.08em;
    line-height: 1;
  }

  .name {
    display: flex;
    align-items: center;
    gap: 0.35em;
    margin-top: 0.25em;
    font-size: calc(var(--house-unit, 1px) * 9.5);
    font-weight: 500;
    color: var(--secondary-text-color);
  }

  .dot {
    width: 0.5em;
    height: 0.5em;
    border-radius: 50%;
    flex: none;
  }

  .name svg {
    width: 1.1em;
    height: 1.1em;
    fill: var(--energy-non-fossil-color, #0f9d58);
  }

  .state-of-charge {
    color: var(--primary-text-color);
    opacity: 0.75;
  }

  .charging {
    color: var(--energy-battery-in-color);
  }

  .discharging {
    color: var(--energy-battery-out-color);
  }

  .outage {
    color: var(--error-color, #db4437);
  }
`;
