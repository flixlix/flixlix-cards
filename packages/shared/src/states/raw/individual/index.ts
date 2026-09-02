import { getEntityStateObj } from "@flixlix-cards/shared/states/utils/get-entity-state-obj";
import { getEntityStateWatts } from "@flixlix-cards/shared/states/utils/get-entity-state-watts";
import { type FlowCardPlusConfig, type IndividualDeviceType } from "@flixlix-cards/shared/types";
import { getEnergyEntityState } from "@flixlix-cards/shared/utils/get-energy-entity-state";
import { isEnergyCard } from "@flixlix-cards/shared/utils/is-energy-card";
import { isNumberValue } from "@flixlix-cards/shared/utils/utils";
import { type HomeAssistant } from "custom-card-helpers";

export const getIndividualState = ({
  hass,
  config,
  energyGrowthMap,
  useDateSelection,
  field,
}: {
  hass: HomeAssistant;
  config: FlowCardPlusConfig;
  energyGrowthMap?: Record<string, number>;
  useDateSelection?: boolean;
  field: IndividualDeviceType;
}) => {
  const energyCard = isEnergyCard(config);
  const entity: string = field?.entity;

  if (entity === undefined) return null;

  const acceptNegative = field?.accept_negative || false;
  const transformSign = (v: number) => (acceptNegative ? v : Math.abs(v));

  if (energyCard) {
    return transformSign(getEnergyEntityState(hass, energyGrowthMap, useDateSelection, entity));
  }

  const individualStateWatts = getEntityStateWatts(hass, entity);

  return transformSign(individualStateWatts);
};

export const getIndividualSecondaryState = (hass: HomeAssistant, field: IndividualDeviceType) => {
  if (typeof field?.entity !== "string") return null;

  const entityObj = getEntityStateObj(hass, field?.secondary_info?.entity);
  const secondaryState = entityObj?.state;

  if (isNumberValue(secondaryState)) return Number(secondaryState);

  return secondaryState;
};
