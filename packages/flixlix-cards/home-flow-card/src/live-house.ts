import { computeCardState, powerReadings, wattsReader } from "@flixlix-cards/shared/card-state";
import { type TemplatesObj } from "@flixlix-cards/shared/types";
import { liveConditionContext } from "@flixlix-cards/shared/utils/condition-context";
import { type HomeAssistant } from "custom-card-helpers";
import { type CarImage } from "./car-image";
import { carScene, carStatus } from "./car-node";
import { drawHouse } from "./draw-house";
import { type FlowConfig } from "./types";

export type LiveHouseInput = {
  config: FlowConfig;
  hass: HomeAssistant;
  templates: TemplatesObj;
  width: number;
  pageHidden: boolean;
  carImage: CarImage | null;
};

export const liveHouse = ({
  config,
  hass,
  templates,
  width,
  pageHidden,
  carImage,
}: LiveHouseInput) => {
  const read = wattsReader(hass);
  const cardState = computeCardState({
    config,
    hass,
    readings: powerReadings(hass, config),
    templates,
    conditionContext: liveConditionContext,
    width,
    pageHidden,
  });
  if (cardState.status !== "ready") {
    return undefined;
  }
  const status = config.car ? carStatus(hass, config.car, read, "power") : "hidden";
  return drawHouse(
    config,
    cardState,
    hass,
    carScene(hass, config.car, status, carImage, read),
    read
  );
};
