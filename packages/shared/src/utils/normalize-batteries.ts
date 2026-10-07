import { type Battery, type BatteryConfig } from "@flixlix-cards/shared/types";

export const normalizeBatteries = (battery?: BatteryConfig): Battery[] => {
  if (!battery) return [];
  return Array.isArray(battery) ? battery.filter(Boolean) : [battery];
};

export const getPrimaryBattery = (battery?: BatteryConfig): Battery | undefined => {
  return normalizeBatteries(battery)[0];
};

export const hasBatteryEntity = (battery?: BatteryConfig): boolean => {
  return normalizeBatteries(battery).some((item) => {
    if (!item?.entity) return false;
    if (typeof item.entity === "object") {
      return Boolean(item.entity.consumption || item.entity.production);
    }
    return item.entity !== undefined;
  });
};

export const serializeBatteries = (batteries: Battery[]): BatteryConfig | undefined => {
  if (batteries.length === 0) return undefined;
  if (batteries.length === 1) return batteries[0];
  return batteries;
};
