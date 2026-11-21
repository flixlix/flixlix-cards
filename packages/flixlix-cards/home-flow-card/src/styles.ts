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
    --house-grille: #e1e2e6;
    --house-soc: #3fc28a;
    --house-soc-green: var(--success-color, #43a047);
    --house-soc-yellow: var(--warning-color, #ffa600);
    --house-soc-red: var(--error-color, #db4437);
    --house-track: #c9ccd2;
    --house-ground: #eceef1;
    --house-shadow: rgba(60, 65, 80, 0.22);
    --house-leader: #9a9ea6;
    --house-car-body: #fdfdfd;
    --house-car-body-shade: #d6d7da;
    --house-car-shine: #ffffff;
    --house-car-glass: #a9abaf;
    --house-car-glass-shade: #86888c;
    --house-car-rail: #9c9ea2;
    --house-car-tyre: #8a8c90;
    --house-car-ground: var(--house-ground);
    --house-view-track: #e5e6ea;
    --house-view-indicator: #ffffff;
    --house-ease-in-out: cubic-bezier(0.645, 0.045, 0.355, 1);
    --house-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
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
      --house-grille: color-mix(in srgb, #000 8%, var(--house-surface));
      --house-track: color-mix(
        in srgb,
        var(--primary-text-color, #212121) 22%,
        var(--house-surface)
      );
      --house-ground: var(--house-surface);
      --house-leader: var(--secondary-text-color, #727272);
      /* the car: light paint, a softly tinted glass canopy and plain wheels, quiet next to the house */
      --house-car-body: color-mix(in srgb, #fff 88%, var(--house-surface));
      --house-car-body-shade: color-mix(in srgb, #000 12%, var(--house-surface));
      --house-car-shine: #fff;
      --house-car-glass: color-mix(in srgb, #000 28%, var(--house-surface));
      --house-car-glass-shade: color-mix(in srgb, #000 46%, var(--house-surface));
      --house-car-rail: color-mix(in srgb, #000 30%, var(--house-surface));
      --house-car-tyre: color-mix(in srgb, #000 45%, var(--house-surface));
      --house-view-track: var(--house-surface);
      --house-view-indicator: var(--card-background-color, #fff);
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
      --house-car-body: color-mix(in srgb, #fff 40%, var(--house-surface));
      --house-car-body-shade: color-mix(in srgb, #000 10%, var(--house-surface));
      --house-car-shine: color-mix(in srgb, #fff 70%, var(--house-surface));
      --house-car-glass: color-mix(in srgb, #fff 4%, var(--house-surface));
      --house-car-glass-shade: color-mix(in srgb, #000 18%, var(--house-surface));
      --house-car-tyre: color-mix(in srgb, #000 14%, var(--house-surface));
      --house-view-track: color-mix(in srgb, #000 25%, var(--house-surface));
      --house-view-indicator: color-mix(in srgb, #fff 10%, var(--house-surface));
    }
  }

  ha-card {
    overflow: hidden;
  }

  .card-content {
    padding: 16px;
  }

  .stage {
    position: relative;
  }

  /* ha-card's header already spaces the title from the content */
  .stage.titled {
    margin-top: -16px;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
  }

  .track,
  .flow,
  .pulse {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .track {
    stroke: var(--house-track);
    stroke-width: calc(var(--wire-scale, 1) * 1);
  }

  /* a wire taking up power fades its colour in rather than popping */
  .power {
    animation: appear 0.4s ease-out;
  }

  @keyframes appear {
    from {
      opacity: 0;
    }
  }

  .flow {
    stroke: var(--wire-color);
    stroke-width: calc(var(--wire-scale, 1) * 1.2);
    opacity: 0.35;
  }

  .pulse {
    stroke: var(--wire-color);
    stroke-width: calc(var(--wire-scale, 1) * 1.8);
    /* period 70, as PULSE in the card; each wire sets its own dash length */
    stroke-dasharray: 18 52;
    animation: pulse linear infinite;
    /* a pulse's length follows its power: grow and shrink it rather than snap */
    transition: stroke-dasharray 0.6s ease;
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

    .spin {
      animation: none;
    }
  }

  .labels {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .label {
    position: absolute;
    white-space: nowrap;
    line-height: 1.05;
    color: var(--primary-text-color);
    pointer-events: auto;
    /* clear of the leader line's end */
    --label-gap: calc(var(--label-unit, 1px) * 5);
    transform: translate(calc(var(--label-unit, 1px) * -10), calc(-100% - var(--label-gap)));
  }

  .label.down {
    transform: translate(calc(var(--label-unit, 1px) * -10), var(--label-gap));
  }

  /* hangs left of its leader, as the heat pump's does to keep off the roof and the home's label */
  .label.left {
    transform: translate(calc(-100% + var(--label-unit, 1px) * 10), calc(-100% - var(--label-gap)));
  }

  .label.down.left {
    transform: translate(calc(-100% + var(--label-unit, 1px) * 10), var(--label-gap));
  }

  /* the heat pump's fan, about its own centre on the unit's face */
  .spin {
    animation: spin 0.9s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .label.clickable {
    cursor: pointer;
  }

  /* a short label like "0 W / Solar" is too small a touch target; widen what takes the tap, not the label */
  .label.clickable::before {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    width: max(100%, 48px);
    height: max(100%, 48px);
    transform: translate(-50%, -50%);
  }

  .label:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    border-radius: 4px;
  }

  .value {
    font-size: calc(var(--label-unit, 1px) * 17 * var(--value-size, 1));
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .unit {
    /* inline-block, so it can slide along as its number changes width */
    display: inline-block;
    font-size: 0.58em;
    margin-left: 0.15em;
    letter-spacing: 0;
  }

  .separator {
    display: inline-block;
    margin: 0 0.25em;
    font-size: 0.58em;
    color: var(--secondary-text-color);
    opacity: 0.6;
  }

  number-flow {
    --number-flow-mask-height: 0.08em;
    line-height: 1;
  }

  .name,
  .status {
    display: flex;
    align-items: center;
    gap: 0.35em;
    font-size: calc(var(--label-unit, 1px) * 9.5);
    font-weight: 500;
    color: var(--secondary-text-color);
  }

  /* even space above and below, so the status sits between value and name */
  .status {
    gap: 0.3em;
    margin: calc(var(--label-unit, 1px) * 0.5) 0 calc(var(--label-unit, 1px) * 3);
  }

  .figure {
    color: var(--primary-text-color);
  }

  .status > span:not(.figure):not(.direction) {
    opacity: 0.6;
  }

  .direction {
    white-space: pre;
    transition: color 0.35s ease;
  }

  /* an empty slot keeps a line's height, so the letters fading out of it stay on the baseline */
  .enter:empty::before {
    content: "\\200b";
  }

  .charging {
    color: var(--energy-battery-in-color);
  }

  .discharging {
    color: var(--energy-battery-out-color);
  }

  .heating {
    color: var(--state-climate-heat-color, #ff8100);
  }

  .cooling {
    color: var(--state-climate-cool-color, #2b9af9);
  }

  .outage {
    color: var(--error-color, #db4437);
  }
`;
