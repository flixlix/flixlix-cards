import { getEntityStateWatts } from "@flixlix-cards/shared/states/utils/get-entity-state-watts";
import { type HomeAssistant } from "custom-card-helpers";
import {
  type BatteryEntityConfig,
  type FlixlixPowerCardConfig,
  type GridEntityConfig,
} from "../types";

export interface SourceFlow {
  toHome: number;
  total: number;
  producing: boolean;
}

export interface ComputedPower {
  grid: SourceFlow & { exporting: number };
  solars: SourceFlow[];
  batteries: (SourceFlow & { charging: boolean; toBattery: number })[];
  devices: { power: number }[];
  home: { totalConsumption: number };
}

function safeNumber(n: number | null | undefined): number {
  return typeof n === "number" && !Number.isNaN(n) ? n : 0;
}

export function readGridPower(
  hass: HomeAssistant,
  cfg?: GridEntityConfig
): { consumption: number; production: number } {
  if (!cfg?.entity) return { consumption: 0, production: 0 };
  if (typeof cfg.entity === "string") {
    const value = safeNumber(getEntityStateWatts(hass, cfg.entity));
    return value >= 0
      ? { consumption: value, production: 0 }
      : { consumption: 0, production: -value };
  }
  return {
    consumption: safeNumber(getEntityStateWatts(hass, cfg.entity.consumption)),
    production: safeNumber(getEntityStateWatts(hass, cfg.entity.production)),
  };
}

export function readBatteryPower(
  hass: HomeAssistant,
  cfg: BatteryEntityConfig
): { discharging: number; charging: number } {
  if (typeof cfg.entity === "string") {
    const value = safeNumber(getEntityStateWatts(hass, cfg.entity));
    return value >= 0 ? { discharging: value, charging: 0 } : { discharging: 0, charging: -value };
  }
  return {
    discharging: safeNumber(getEntityStateWatts(hass, cfg.entity.consumption)),
    charging: safeNumber(getEntityStateWatts(hass, cfg.entity.production)),
  };
}

export function computePower(hass: HomeAssistant, config: FlixlixPowerCardConfig): ComputedPower {
  const { entities } = config;

  const grid = readGridPower(hass, entities.grid);
  const solarTotals = (entities.solars ?? []).map((s) =>
    Math.max(safeNumber(getEntityStateWatts(hass, s.entity)), 0)
  );
  const totalSolar = solarTotals.reduce((a, b) => a + b, 0);
  const batteries = (entities.batteries ?? []).map((bat) => readBatteryPower(hass, bat));

  const totalSourceIn =
    totalSolar + grid.consumption + batteries.reduce((acc, b) => acc + b.discharging, 0);
  const gridExport = grid.production;
  const totalCharging = batteries.reduce((acc, b) => acc + b.charging, 0);

  const devices = (entities.devices ?? []).map((dev) => ({
    power: Math.max(safeNumber(getEntityStateWatts(hass, dev.entity)), 0),
  }));

  const homeConsumption = Math.max(totalSourceIn - gridExport - totalCharging, 0);

  // Naive per-source allocation: scale each source by its share of total
  // input. Visually informative without modelling battery → grid routing
  // through inverters etc.
  const allocate = (share: number) =>
    totalSourceIn > 0 ? (share / totalSourceIn) * homeConsumption : 0;

  const gridToHome = allocate(grid.consumption);
  const solarsOut: SourceFlow[] = solarTotals.map((total) => ({
    toHome: allocate(total),
    total,
    producing: total > 0,
  }));
  const batteriesToHome = batteries.map((b) => allocate(b.discharging));

  return {
    grid: {
      toHome: gridToHome,
      total: grid.consumption,
      exporting: gridExport,
      producing: grid.consumption > 0,
    },
    solars: solarsOut,
    batteries: batteries.map((b, i) => ({
      toHome: batteriesToHome[i] ?? 0,
      total: b.discharging,
      toBattery: b.charging,
      charging: b.charging > 0 && b.discharging === 0,
      producing: b.discharging > 0,
    })),
    devices,
    home: { totalConsumption: homeConsumption },
  };
}
