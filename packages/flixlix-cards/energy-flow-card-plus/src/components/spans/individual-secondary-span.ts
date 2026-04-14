import { type EnergyFlowCardPlus } from "@/energy-flow-card-plus";
import { type EnergyFlowCardPlusConfig } from "@/energy-flow-card-plus-config";
import { type IndividualObject } from "@/states/raw/individual/get-individual-object";
import { type TemplatesObj } from "@/type";
import { displayValue } from "@/utils/display-value";
import { isNumberValue } from "@/utils/utils";
import { type HomeAssistant } from "custom-card-helpers";
import { html, nothing } from "lit";
import { baseSecondarySpan } from "./base-secondary-span";

export type IndividualKey = `left-top` | `left-bottom` | `right-top` | `right-bottom`;

export const individualSecondarySpan = (
  hass: HomeAssistant,
  main: EnergyFlowCardPlus,
  config: EnergyFlowCardPlusConfig,
  templatesObj: TemplatesObj,
  individual: IndividualObject,
  index: number,
  key: IndividualKey
) => {
  const templateResult: string | undefined = templatesObj.individual[index];

  const value = individual?.secondary?.has
    ? displayValue(hass, config, individual?.secondary?.state, {
        unit: individual?.secondary?.unit || undefined,
        unitWhiteSpace: individual.secondary.unit_white_space,
        decimals: individual?.secondary?.decimals || 0,
        accept_negative: individual?.secondary?.accept_negative || false,
        watt_threshold: config.watt_threshold,
      })
    : undefined;

  const shouldShowSecondary = () => {
    if (templateResult) return true;
    if (individual?.secondary?.displayZero === true) return true;
    if (!individual?.secondary?.state) return false;
    if (!isNumberValue(individual?.secondary?.state)) return true;

    const toleranceSet = individual?.secondary?.displayZeroTolerance ?? 0;
    return (
      Number(individual.secondary.state) >= toleranceSet ||
      (individual.secondary.accept_negative &&
        typeof Number(+individual.secondary.state) === "number")
    );
  };

  return html` ${shouldShowSecondary()
    ? html`${baseSecondarySpan({
        main: main,
        className: key,
        entityId:
          individual?.field?.secondary_info?.entity || individual?.secondary.entity || undefined,
        icon: individual?.secondary?.icon || undefined,
        value,
        template: templatesObj.individual[index] || undefined,
        actions: {
          tap_action:
            individual?.field?.secondary_info?.tap_action || individual?.secondary?.tap_action,
          hold_action:
            individual?.field?.secondary_info?.hold_action || individual?.secondary?.hold_action,
          double_tap_action:
            individual?.field?.secondary_info?.double_tap_action ||
            individual?.secondary?.double_tap_action,
        },
      })}`
    : nothing}`;
};
