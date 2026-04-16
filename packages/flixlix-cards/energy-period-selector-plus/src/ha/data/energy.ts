import type { HomeAssistant } from "../types";

export enum CompareMode {
  NONE = 0,
  PREVIOUS = 1,
}

export interface EnergyData {
  start: Date;
  end?: Date;
  startCompare?: Date;
  endCompare?: Date;
}

export interface EnergyCollection {
  start?: Date;
  end?: Date;
  startCompare?: Date;
  subscribe(callback: (data: EnergyData) => void): () => void;
  setPeriod(newStart: Date, newEnd?: Date): void;
  setCompare(compare: CompareMode): void;
  refresh(): void;
}

export const getEnergyDataCollection = (
  hass: HomeAssistant,
  options?: { key?: string }
): EnergyCollection => {
  const conn = hass.connection as any;
  const key = options?.key ? `_${options.key}` : "_energy";
  return conn[key] as EnergyCollection;
};

export const downloadEnergyData = (hass: HomeAssistant, collectionKey?: string): void => {
  try {
    const collection = getEnergyDataCollection(hass, { key: collectionKey });
    if (!collection) return;

    const haEnergyModule = (window as any).__ha_energy_download;
    if (typeof haEnergyModule === "function") {
      haEnergyModule(hass, collectionKey);
      return;
    }

    hass.callWS({
      type: "energy/download",
      start: collection.start?.toISOString(),
      end: collection.end?.toISOString(),
    });
  } catch {
    // Energy download not available
  }
};
