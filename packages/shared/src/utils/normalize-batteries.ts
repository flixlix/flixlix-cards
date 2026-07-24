import { type Battery, type BatteryField } from "@flixlix-cards/shared/types";

export const MAX_VISIBLE_BATTERIES = 3;

export const hasBatteryEntity = (battery: Battery | undefined): boolean => {
  if (!battery?.entity) return false;
  if (typeof battery.entity === "object") {
    return Boolean(battery.entity.consumption || battery.entity.production);
  }
  return battery.entity !== undefined && battery.entity !== "";
};

export const isSatelliteBattery = (battery: Battery | undefined): boolean =>
  battery?.role === "satellite";

export const toBatteryList = (battery?: BatteryField): Battery[] => {
  if (!battery) return [];
  return (Array.isArray(battery) ? battery : [battery]).slice(0, MAX_VISIBLE_BATTERIES);
};

export const normalizeBatteries = (battery?: BatteryField): Battery[] => {
  if (!battery) return [];
  const list = Array.isArray(battery) ? battery : [battery];
  return list.filter(hasBatteryEntity).slice(0, MAX_VISIBLE_BATTERIES);
};

export const getDistributionBatteries = (battery?: BatteryField): Battery[] => {
  const all = normalizeBatteries(battery);
  const primaries = all.filter((item) => !isSatelliteBattery(item));
  return primaries.length > 0 ? primaries : all;
};

export const getSatelliteBatteries = (battery?: BatteryField): Battery[] => {
  const all = normalizeBatteries(battery);
  const primaries = all.filter((item) => !isSatelliteBattery(item));
  if (primaries.length === 0) return [];
  return all.filter(isSatelliteBattery);
};

export const getPrimaryBattery = (battery?: BatteryField): Battery | undefined =>
  getDistributionBatteries(battery)[0];

export const getBatteryDisplayZeroTolerance = (battery?: BatteryField): number =>
  Math.max(0, ...getDistributionBatteries(battery).map((item) => item.display_zero_tolerance ?? 0));

export const serializeBatteries = (batteries: Battery[]): BatteryField | undefined => {
  if (batteries.length === 0) return undefined;
  if (batteries.length === 1) return batteries[0];
  return batteries;
};
