import { type CardMainContext, type IndividualObject } from "@flixlix-cards/shared/types";
import { nothing, type TemplateResult } from "lit";
import { baseSecondarySpan } from "./base-secondary-span";

export type IndividualKey = `left-top` | `left-bottom` | `right-top` | `right-bottom`;

export const individualSecondarySpan = (
  main: CardMainContext,
  individual: IndividualObject,
  className: string
): TemplateResult | typeof nothing => {
  const { secondary } = individual;
  if (!secondary.show) {
    return nothing;
  }
  return baseSecondarySpan({
    main,
    className,
    entityId: secondary.entity,
    icon: secondary.icon,
    value: secondary.text,
    template: secondary.templateResult,
    actions: {
      tap_action: secondary.tap_action,
      hold_action: secondary.hold_action,
      double_tap_action: secondary.double_tap_action,
    },
  });
};
