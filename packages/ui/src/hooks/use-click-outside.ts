import { type RefObject, useEffect } from "react";

type UseClickOutsideOptions = {
  ref: RefObject<HTMLElement | null>;
  handler: (event: MouseEvent | TouchEvent) => void;
  enabled?: boolean;
};

export function useClickOutside({ ref, handler, enabled = true }: UseClickOutsideOptions) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const listener = (event: MouseEvent | TouchEvent) => {
      const element = ref.current;
      if (!element || (event.target instanceof Node && element.contains(event.target))) {
        return;
      }

      handler(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler, enabled]);
}
