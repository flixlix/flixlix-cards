const prefixFactors: Record<string, number> = {
  m: 1e-3,
  k: 1e3,
  K: 1e3,
  M: 1e6,
  G: 1e9,
  T: 1e12,
  P: 1e15,
  E: 1e18,
  Z: 1e21,
  Y: 1e24,
};

/**
 * How many W (or Wh) one of `unit` is: 1000 for kW or kWh, 1 for W or Wh, and undefined for any
 * unit that is not W or Wh, such as m³ or L/min.
 */
export const powerUnitFactor = (unit: string): number | undefined => {
  const match = /^(.?)Wh?$/u.exec(unit);
  if (!match) {
    return undefined;
  }
  const prefix = match[1] ?? "";
  return prefix === "" ? 1 : prefixFactors[prefix];
};
