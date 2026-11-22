import * as React from "react";

import { cn } from "cn";

type Option = { value: string; label: string };

const ITEM = "rounded-full px-3.5 py-1.5 font-medium whitespace-nowrap";
const PILL = "dark:bg-[oklch(0.37_0.01_250)]";
const SELECTED = cn(
  "bg-card text-foreground shadow-[0_1px_1.5px_rgb(0_0_0/0.12)] dark:shadow-none",
  PILL
);

/**
 * Pick one of a few options. The selected look is a copy of the row clipped to the selected
 * option; moving the clip slides the pill and recolors the labels in one motion, where separate
 * color transitions would show two labels half-colored at once.
 */
export function SegmentedControl({
  legend,
  options,
  value,
  onChange,
  className,
}: {
  legend: string;
  options: readonly Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const row = React.useRef<HTMLFieldSetElement>(null);
  const buttons = React.useRef(new Map<string, HTMLButtonElement>());
  const [clip, setClip] = React.useState<string>();
  // No transition until the clip has been placed once, so it doesn't slide in from the edge.
  const [placed, setPlaced] = React.useState(false);

  const measure = React.useCallback(() => {
    const container = row.current;
    const button = buttons.current.get(value);
    if (!container || !button) {
      return;
    }
    const top = button.offsetTop;
    const left = button.offsetLeft;
    const right = container.clientWidth - left - button.offsetWidth;
    const bottom = container.clientHeight - top - button.offsetHeight;
    setClip(`inset(${top}px ${right}px ${bottom}px ${left}px round 9999px)`);
  }, [value]);

  React.useLayoutEffect(measure, [measure]);

  React.useEffect(() => {
    const container = row.current;
    if (!container) {
      return undefined;
    }
    // Web fonts swap in after the first measure and change every label's width.
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [measure]);

  React.useEffect(() => {
    if (clip && !placed) {
      const frame = requestAnimationFrame(() => setPlaced(true));
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [clip, placed]);

  return (
    <fieldset
      ref={row}
      className={cn(
        "bg-foreground/[0.05] ring-foreground/[0.07] relative inline-flex rounded-full p-1 text-sm ring-1 backdrop-blur-sm ring-inset",
        className
      )}
    >
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => (
        <button
          key={option.value}
          ref={(element) => {
            if (element) {
              buttons.current.set(option.value, element);
            } else {
              buttons.current.delete(option.value);
            }
          }}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            ITEM,
            "text-muted-foreground hover:text-foreground transition-colors duration-150",
            // Until the clip is measured, after hydration, the selected option is its own pill.
            !clip && option.value === value && SELECTED
          )}
        >
          {option.label}
        </button>
      ))}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 drop-shadow-[0_1px_1.5px_rgb(0_0_0/0.12)] dark:drop-shadow-none"
      >
        <div
          style={{ clipPath: clip }}
          className={cn(
            "bg-card flex h-full rounded-full p-1",
            PILL,
            clip ? "opacity-100" : "opacity-0",
            placed &&
              "transition-[clip-path] duration-300 ease-(--ease-out-strong) motion-reduce:duration-0"
          )}
        >
          {options.map((option) => (
            <span key={option.value} className={cn(ITEM, "text-foreground")}>
              {option.label}
            </span>
          ))}
        </div>
      </div>
    </fieldset>
  );
}
