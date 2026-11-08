/** The energy meters of `.hass_dev/packages/energy.yaml`, with their entity ids. */
export const ENERGY_METERS = [
  { id: "sensor.grid_import_energy", name: "Grid Import Energy" },
  { id: "sensor.grid_export_energy", name: "Grid Export Energy" },
  { id: "sensor.solar_energy", name: "Solar Energy" },
  { id: "sensor.battery_charge_energy", name: "Battery Charge Energy" },
  { id: "sensor.battery_discharge_energy", name: "Battery Discharge Energy" },
  { id: "sensor.ev_charger_energy", name: "EV Charger Energy" },
  { id: "sensor.heat_pump_energy", name: "Heat Pump Energy" },
  { id: "sensor.washing_machine_energy", name: "Washing Machine Energy" },
] as const;

export type EnergyMeter = (typeof ENERGY_METERS)[number]["id"];
type DailyTotals = Record<EnergyMeter, number>;

/**
 * kWh per meter for one day. Every period has its own totals so switching periods in
 * energy-date-selection visibly changes what the energy cards show.
 */
export const DAILY_KWH = {
  today: {
    "sensor.grid_import_energy": 5,
    "sensor.grid_export_energy": 3,
    "sensor.solar_energy": 12,
    "sensor.battery_charge_energy": 4,
    "sensor.battery_discharge_energy": 2,
    "sensor.ev_charger_energy": 6,
    "sensor.heat_pump_energy": 3,
    "sensor.washing_machine_energy": 1,
  },
  yesterday: {
    "sensor.grid_import_energy": 9,
    "sensor.grid_export_energy": 1,
    "sensor.solar_energy": 4,
    "sensor.battery_charge_energy": 1,
    "sensor.battery_discharge_energy": 3,
    "sensor.ev_charger_energy": 2,
    "sensor.heat_pump_energy": 8,
    "sensor.washing_machine_energy": 2,
  },
  earlier: {
    "sensor.grid_import_energy": 7,
    "sensor.grid_export_energy": 2,
    "sensor.solar_energy": 6,
    "sensor.battery_charge_energy": 2,
    "sensor.battery_discharge_energy": 2,
    "sensor.ev_charger_energy": 4,
    "sensor.heat_pump_energy": 5,
    "sensor.washing_machine_energy": 1,
  },
} as const satisfies Record<string, DailyTotals>;

/** Days before yesterday that get the "earlier" totals, enough to fill a week and a month. */
export const EARLIER_DAYS = 35;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export type StatisticRow = { start: string; state: number; sum: number };

const startOfUtcDay = (date: Date) =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

/**
 * Hourly rows from the oldest day up to today, in UTC (the dev instance runs in UTC).
 * Past days spread their total evenly over 24 hours; today's whole total sits in its first
 * hour, so "today" shows the same value whenever the tests run.
 */
export function hourlyRows(meter: EnergyMeter, now: Date): StatisticRow[] {
  const today = startOfUtcDay(now);
  const rows: StatisticRow[] = [];
  let sum = 0;
  for (let daysAgo = EARLIER_DAYS + 1; daysAgo >= 1; daysAgo--) {
    const dayTotal = daysAgo === 1 ? DAILY_KWH.yesterday[meter] : DAILY_KWH.earlier[meter];
    const dayStart = today - daysAgo * DAY_MS;
    for (let hour = 0; hour < 24; hour++) {
      sum += dayTotal / 24;
      rows.push({ start: new Date(dayStart + hour * HOUR_MS).toISOString(), state: sum, sum });
    }
  }
  sum += DAILY_KWH.today[meter];
  rows.push({ start: new Date(today).toISOString(), state: sum, sum });
  return rows;
}
