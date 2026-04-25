import { type FlowCardPlusConfig } from "@flixlix-cards/shared/types";
import { displayValue } from "@flixlix-cards/shared/utils/display-value";
import { type HomeAssistant } from "custom-card-helpers";
import { type IndividualObject } from "./get-individual-object";

export const getIndividualDisplayState = (
  hass: HomeAssistant,
  config: FlowCardPlusConfig,
  individualObj?: IndividualObject
) => {
  if (!individualObj) return "";
  if (individualObj?.state === undefined) return "";

  return displayValue(hass, config, individualObj?.state, {
    decimals: individualObj.field?.decimals,
    unit: individualObj.field?.unit_of_measurement,
    unitWhiteSpace: individualObj.field?.unit_white_space,
  });
};
