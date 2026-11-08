import { CardPreview } from "@/components/card-preview";
import {
  breakdownDemo,
  type Demo,
  energyDemo,
  houseDemo,
  periodDemo,
  powerDemo,
} from "@/components/demos";

const demos: Record<"power" | "house" | "energy" | "period" | "breakdown", Demo> = {
  power: powerDemo,
  house: houseDemo,
  energy: energyDemo,
  period: periodDemo,
  breakdown: breakdownDemo,
};

/** A live card on a Home Assistant dashboard, in place of a screenshot or recording. */
export function CardDemo({
  demo,
  width,
  className,
}: {
  demo: keyof typeof demos;
  width?: number;
  className?: string;
}) {
  const { configs, states, energy } = demos[demo];
  return (
    <CardPreview
      configs={configs}
      states={states}
      energy={energy}
      width={width ?? demos[demo].width ?? 500}
      className={className}
    />
  );
}
