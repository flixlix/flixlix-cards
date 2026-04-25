import { type DisplayZeroLinesMode } from "@flixlix-cards/shared/types";
import { type HomeAssistant } from "custom-card-helpers";
import { getFirstEntityName } from "../states/utils/mutli-entity";

export const defaultValues = {
  maxFlowRate: 6,
  minFlowRate: 0.75,
  baseDecimals: 0,
  kiloDecimals: 1,
  minExpectedPower: 0.01,
  maxExpectedPower: 2000,
  kiloThreshold: 1000,
  megaThreshold: 1000000,
  transparencyZeroLines: 0,
  displayZeroLines: {
    mode: "show" as DisplayZeroLinesMode,
    transparency: 50,
    grey_color: [189, 189, 189],
  },
};

export function getDefaultConfig(
  hass: HomeAssistant,
  cardType: "power" | "energy" = "power"
): object {
  function checkStrings(entiyId: string, testStrings: string[]): boolean {
    const firstId = getFirstEntityName(entiyId);
    const friendlyName = hass.states[firstId]?.attributes.friendly_name;
    return testStrings.some((str) => firstId.includes(str) || friendlyName?.includes(str));
  }
  const isEnergyCard = cardType === "energy";
  let optionEntities: string[];

  if (isEnergyCard) {
    const energyEntities = Object.keys(hass.states).filter((entityId) => {
      const stateObj = hass.states[getFirstEntityName(entityId)];
      const isAvailable =
        (stateObj?.state && stateObj.attributes && stateObj.attributes.device_class === "energy") ||
        stateObj?.entity_id.includes("energy");
      return isAvailable;
    });
    optionEntities = energyEntities;
  } else {
    const powerEntities = Object.keys(hass.states).filter((entityId) => {
      const stateObj = hass.states[getFirstEntityName(entityId)];
      const isAvailable =
        (stateObj?.state && stateObj.attributes && stateObj.attributes.device_class === "power") ||
        stateObj?.entity_id.includes("power");
      return isAvailable;
    });
    optionEntities = powerEntities;
  }

  const gridTestString = ["grid", "utility", "net", "meter"];
  const solarTestString = ["solar", "pv", "photovoltaic", "inverter"];
  const batteryTestString = ["battery"];
  const batteryPercentTestString = [
    "battery_percent",
    "battery_level",
    "state_of_charge",
    "soc",
    "percentage",
  ];
  const firstGridEntity = optionEntities.filter((entityId) =>
    checkStrings(entityId, gridTestString)
  )[0];
  const firstSolarEntity = optionEntities.filter((entityId) =>
    checkStrings(entityId, solarTestString)
  )[0];
  const firstBatteryEntity = optionEntities.filter((entityId) =>
    checkStrings(entityId, batteryTestString)
  )[0];

  const percentageEntities = Object.keys(hass.states).filter((entityId) => {
    const stateObj = hass.states[entityId];
    const isAvailable =
      stateObj &&
      stateObj.state &&
      stateObj.attributes &&
      stateObj.attributes.unit_of_measurement === "%";
    return isAvailable;
  });

  const firstBatteryPercentageEntity = percentageEntities.filter((entityId) =>
    checkStrings(entityId, batteryPercentTestString)
  )[0];
  return {
    entities: {
      battery: {
        entity: firstBatteryEntity ?? "",
        state_of_charge: firstBatteryPercentageEntity ?? "",
      },
      grid: firstGridEntity ? { entity: firstGridEntity } : undefined,
      solar: firstSolarEntity ? { entity: firstSolarEntity, display_zero_state: true } : undefined,
    },
    clickable_entities: true,
    display_zero_lines: true,
    use_new_flow_rate_model: true,
    base_decimals: defaultValues.baseDecimals,
    kilo_decimals: defaultValues.kiloDecimals,
    min_flow_rate: defaultValues.minFlowRate,
    max_flow_rate: defaultValues.maxFlowRate,
    max_expected_power: defaultValues.maxExpectedPower,
    min_expected_power: defaultValues.minExpectedPower,
    kilo_threshold: defaultValues.kiloThreshold,
    mega_threshold: defaultValues.megaThreshold,
    transparency_zero_lines: defaultValues.transparencyZeroLines,
    sort_individual_devices: false,
  };
}
