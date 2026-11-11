import { html, type TemplateResult } from "lit";
import { type drawHouse } from "./draw-house";
import { type Box } from "./extent";
import { fitLabels, wireScale } from "./label-size";
import { type LabelContext, labelsHtml } from "./render-labels";
import { gridFade } from "./render-wires";
import { type FlowConfig } from "./types";

export type StageInput = {
  house: ReturnType<typeof drawHouse>;
  boxFor: (scale: number) => Box;
  width: number;
  config: FlowConfig;
  context: Omit<LabelContext, "layout">;
  selector: unknown;
};

export const stageHtml = ({
  house: { labels, scene, leaders, layout },
  boxFor,
  width,
  config,
  context,
  selector,
}: StageInput): TemplateResult => {
  const fit = fitLabels(width, boxFor);
  const { box, labelUnit } = fit;
  const scaleOfWires = wireScale(fit, config.wire_width);
  return html`
    <ha-card .header=${config.title}>
      <div
        class="stage ${config.title ? "titled" : ""}"
        style=${`--label-unit: ${labelUnit}px; --wire-scale: ${scaleOfWires}`}
      >
        <svg
          viewBox="${box.x} ${box.y} ${box.width} ${box.height}"
          role="img"
          aria-label=${labels.map((label) => label.name).join(", ")}
        >
          ${gridFade(box)} ${scene(scaleOfWires)} ${leaders}
        </svg>
        ${labelsHtml(labels, box, { ...context, layout })} ${selector}
      </div>
    </ha-card>
  `;
};
