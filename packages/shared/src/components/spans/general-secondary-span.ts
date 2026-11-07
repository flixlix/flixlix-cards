import { type CardMainContext, type SecondaryInfoObject } from "@flixlix-cards/shared/types";
import { nothing } from "lit";
import { baseSecondarySpan } from "./base-secondary-span";

type SecondaryKey = "grid" | "solar" | "home" | "nonFossilFuel";

export const generalSecondarySpan = (
  main: CardMainContext,
  secondary: SecondaryInfoObject,
  key: SecondaryKey
) => {
  if (!secondary.show) {
    return nothing;
  }

  return baseSecondarySpan({
    main,
    className: key,
    entityId: secondary.entity,
    icon: secondary.icon,
    value: secondary.text,
    actions: {
      tap_action: secondary.tap_action,
      hold_action: secondary.hold_action,
      double_tap_action: secondary.double_tap_action,
    },
    template: secondary.templateResult,
  });
};
