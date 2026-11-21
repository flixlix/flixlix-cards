import * as React from "react";
import { Button } from "@flixlix-cards/ui/components/button";
import { CardPreview } from "@/components/card-preview";
import { topologyDemos } from "@/components/demos";

/** The same readings drawn with each topology, switchable, on the real card. */
export function TopologyDemo({ card }: { card: "power" | "energy" }) {
  const demos = React.useMemo(() => topologyDemos(card), [card]);
  const [selected, setSelected] = React.useState(0);
  const current = demos[selected] ?? demos[0];
  if (!current) {
    return null;
  }
  return (
    <figure className="mb-6 flex flex-col items-center gap-3">
      <fieldset className="flex flex-wrap justify-center gap-2">
        <legend className="sr-only">Topology</legend>
        {demos.map(({ topology }, index) => (
          <Button
            key={topology}
            size="sm"
            variant={index === selected ? "secondary" : "outline"}
            aria-pressed={index === selected}
            onClick={() => setSelected(index)}
          >
            <code>{topology}</code>
          </Button>
        ))}
      </fieldset>
      <CardPreview
        configs={current.demo.configs}
        states={current.demo.states}
        energy={current.demo.energy}
        className="w-fit max-w-full rounded-xl border"
      />
      <figcaption className="text-muted-foreground text-center text-sm">
        {current.caption}
      </figcaption>
    </figure>
  );
}
