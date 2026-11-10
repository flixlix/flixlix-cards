import {
  type CarReading,
  conditionEntities,
  conditionsMet,
} from "@flixlix-cards/shared/card-state";
import { getEntityState } from "@flixlix-cards/shared/states/utils/get-entity-state";
import { getEntityStateWatts } from "@flixlix-cards/shared/states/utils/get-entity-state-watts";
import { liveConditionContext } from "@flixlix-cards/shared/utils/condition-context";
import { type HomeAssistant } from "custom-card-helpers";
import { type CarImage } from "./car-image";
import { type CarConfig } from "./labels";
import { type HouseCar } from "./types";

/**
 * Active: charging or feeding the home, wired to the outlet. Idle: parked, unplugged and faded.
 * Hidden: away, though the card keeps its room so the house does not jump.
 */
export type CarStatus = "active" | "idle" | "hidden";

/** The car's power in W, or null while its entity is unavailable. */
const carPower = (hass: HomeAssistant, car: HouseCar): number | null =>
  getEntityState(hass, car.entity) === null ? null : getEntityStateWatts(hass, car.entity);

/** The car's state of charge in %, or null without one. */
const carCharge = (hass: HomeAssistant, car: HouseCar): number | null =>
  car.state_of_charge ? getEntityState(hass, car.state_of_charge) : null;

/**
 * Hidden unless its `visibility` conditions hold; then idle while its `idle` conditions hold, or
 * without any, while it draws no power.
 */
export const carStatus = (hass: HomeAssistant, car: HouseCar): CarStatus => {
  if (car.visibility && !conditionsMet(car.visibility, hass, liveConditionContext)) {
    return "hidden";
  }
  if (car.idle) {
    return conditionsMet(car.idle, hass, liveConditionContext) ? "idle" : "active";
  }
  return carPower(hass, car) ? "active" : "idle";
};

/** The entities the car reads, its conditions' included, so the card redraws when they change. */
export const carEntities = (car: HouseCar | undefined): string[] =>
  [
    car?.entity,
    car?.state_of_charge,
    ...conditionEntities(car?.visibility),
    ...conditionEntities(car?.idle),
  ].filter((id): id is string => Boolean(id));

/** What the scene needs for a configured car. */
export type CarScene = {
  /** Its power, for its wire: only while it is active. */
  reading: CarReading | undefined;
  label: CarConfig;
  /** Undefined: nothing drawn. Null: not drawn for the theme yet. */
  image: CarImage | null | undefined;
  /** A configured car keeps its room in the card, even while hidden. */
  reserve: boolean;
};

export const carScene = (
  hass: HomeAssistant,
  car: HouseCar | undefined,
  status: CarStatus,
  image: CarImage | null
): CarScene => {
  if (!car || status === "hidden") {
    return { reading: undefined, label: undefined, image: undefined, reserve: Boolean(car) };
  }
  return {
    reading: status === "active" ? { power: carPower(hass, car) } : undefined,
    label: { ...car, charge: carCharge(hass, car), idle: status === "idle" },
    image,
    reserve: true,
  };
};
