import {
  computeNonFossilFromCollection,
  type FossilEnergyConsumption,
} from "@flixlix-cards/shared/states/utils/energy-period";
import { type NodeState } from "@flixlix-cards/shared/types";
import { type UnitFamily } from "./types";

/** Node totals after zero tolerance. */
export type SplitInput = {
  fromGrid: number;
  toGrid: number;
  solarTotal: number;
  toBattery: number;
  fromBattery: number;
  solarHas: boolean;
  batteryHas: boolean;
  tolerance: { grid: number; battery: number; solar: number };
  outage: boolean;
  generator: number;
  nonFossilHas: boolean;
  /** Fossil share of grid import, in percent. */
  fossilPercentage: number;
  fossilEnergyConsumption?: FossilEnergyConsumption;
};

export type Split = {
  fromGrid: number;
  toGrid: number;
  gridToHome: number;
  gridToBattery: number;
  solarToHome: NodeState;
  solarToBattery: NodeState;
  solarToGrid: NodeState;
  batteryToHome: number;
  batteryToGrid: number;
  nonFossilHas: boolean;
  nonFossilPower: NodeState;
};

const aboveTolerance = (value: number, tolerance: number) => (value > tolerance ? value : 0);

type BatteryCharge = { gridToBattery: number; batteryToGrid: number };

/** Battery charging beyond what solar covers is drawn from the grid, capped at the grid import. */
function gridChargeForSolarShortfall(input: SplitInput, shortfall: number): BatteryCharge {
  if (!input.batteryHas) {
    return { gridToBattery: 0, batteryToGrid: 0 };
  }
  if (shortfall > input.fromGrid) {
    return {
      gridToBattery: input.fromGrid,
      batteryToGrid: Math.min(shortfall - input.fromGrid, 0),
    };
  }
  return { gridToBattery: shortfall, batteryToGrid: 0 };
}

type SolarSplit = BatteryCharge & { solarToHome: NodeState; solarToBattery: NodeState };

function solarAndBatteryCharge(input: SplitInput, solarUnset: NodeState): SolarSplit {
  const { toGrid, solarTotal, toBattery } = input;
  const solarToHome = input.solarHas ? solarTotal - toGrid - toBattery : solarUnset;
  if (solarToHome !== null && solarToHome < 0) {
    return {
      solarToHome: 0,
      solarToBattery: solarUnset,
      ...gridChargeForSolarShortfall(input, Math.abs(solarToHome)),
    };
  }
  if (toBattery > 0) {
    const solarToBattery = solarTotal - (solarToHome ?? 0) - toGrid;
    return {
      solarToHome,
      solarToBattery,
      gridToBattery: toBattery - solarToBattery,
      batteryToGrid: 0,
    };
  }
  return { solarToHome, solarToBattery: solarUnset, gridToBattery: 0, batteryToGrid: 0 };
}

type BatterySplit = { solarToBattery: NodeState; batteryToGrid: number; batteryToHome: number };

function batteryDischarge(
  input: SplitInput,
  solar: SolarSplit,
  gridToBattery: number,
  tolerance: number
): BatterySplit {
  if (!input.batteryHas) {
    return {
      solarToBattery: solar.solarToBattery,
      batteryToGrid: solar.batteryToGrid,
      batteryToHome: 0,
    };
  }
  let batteryToGrid = input.toGrid;
  let solarToBattery = solar.solarToBattery;
  if (input.solarHas) {
    batteryToGrid =
      solar.batteryToGrid === 0
        ? Math.max(0, input.toGrid - input.solarTotal - input.toBattery - gridToBattery)
        : solar.batteryToGrid;
    const solarBelowTolerance = input.tolerance.solar && input.tolerance.solar >= input.solarTotal;
    solarToBattery = solarBelowTolerance ? 0 : input.toBattery - gridToBattery;
  }
  batteryToGrid = aboveTolerance(batteryToGrid, tolerance);
  return { solarToBattery, batteryToGrid, batteryToHome: input.fromBattery - batteryToGrid };
}

/** Live power: solar feeds home first, then battery and grid; remaining import feeds home. */
function splitPower(input: SplitInput): Split {
  const { fromGrid, toGrid, solarTotal, tolerance } = input;
  const largestGridBatteryTolerance = Math.max(tolerance.grid, tolerance.battery);
  const solarUnset: NodeState = solarTotal === 0 ? 0 : null;
  const solar = solarAndBatteryCharge(input, solarUnset);
  const { solarToHome } = solar;
  const gridToBattery = aboveTolerance(solar.gridToBattery, largestGridBatteryTolerance);
  const { solarToBattery, batteryToGrid, batteryToHome } = batteryDischarge(
    input,
    solar,
    gridToBattery,
    largestGridBatteryTolerance
  );
  const solarToGrid = input.solarHas && toGrid ? toGrid - batteryToGrid : solarUnset;

  if (input.outage) {
    const generator = Math.max(input.generator, 0);
    return {
      fromGrid: generator,
      toGrid: 0,
      gridToBattery,
      solarToHome,
      solarToBattery,
      batteryToHome,
      batteryToGrid: 0,
      solarToGrid: 0,
      nonFossilHas: false,
      gridToHome: Math.max(generator - gridToBattery, 0),
      nonFossilPower: null,
    };
  }
  const gridToHome = Math.max(fromGrid - gridToBattery, 0);
  return {
    fromGrid,
    toGrid,
    gridToHome,
    gridToBattery,
    solarToHome,
    solarToBattery,
    solarToGrid,
    batteryToHome,
    batteryToGrid,
    nonFossilHas: input.nonFossilHas,
    nonFossilPower: input.nonFossilHas ? gridToHome * (1 - input.fossilPercentage / 100) : null,
  };
}

/** Energy over a period, split in the order the Home Assistant energy dashboard uses. */
function splitEnergy(input: SplitInput): Split {
  const fromGrid = Math.max(input.fromGrid, 0);
  const toGrid = Math.max(input.toGrid, 0);
  const solarTotal = Math.max(input.solarTotal, 0);
  const batteryIn = Math.max(input.toBattery, 0);
  const batteryOut = Math.max(input.fromBattery, 0);
  let consumption = Math.max(fromGrid + solarTotal + batteryOut - toGrid - batteryIn, 0);
  let remainingFromGrid = fromGrid;

  let gridToBattery = Math.max(0, Math.min(batteryIn, remainingFromGrid - consumption));
  remainingFromGrid -= gridToBattery;
  const solarToBattery = Math.min(solarTotal, batteryIn - gridToBattery);
  const remainingBatteryIn = batteryIn - gridToBattery - solarToBattery;
  const solarToGrid = Math.min(solarTotal - solarToBattery, toGrid);
  const remainingSolar = solarTotal - solarToBattery - solarToGrid;
  let batteryToGrid = Math.min(batteryOut, toGrid - solarToGrid);
  const remainingBatteryOut = batteryOut - batteryToGrid;
  const secondGridToBattery = Math.min(remainingFromGrid, remainingBatteryIn);
  gridToBattery += secondGridToBattery;
  remainingFromGrid -= secondGridToBattery;
  const solarToHome = Math.min(consumption, remainingSolar);
  consumption -= solarToHome;
  const batteryToHome = Math.min(consumption, remainingBatteryOut);
  consumption -= batteryToHome;
  const gridToHome = Math.min(consumption, remainingFromGrid);

  const largestGridBatteryTolerance = Math.max(input.tolerance.grid, input.tolerance.battery);
  gridToBattery = aboveTolerance(gridToBattery, largestGridBatteryTolerance);
  batteryToGrid = aboveTolerance(batteryToGrid, largestGridBatteryTolerance);

  if (input.outage) {
    const generator = Math.max(input.generator, 0);
    return {
      fromGrid: generator,
      toGrid: 0,
      gridToHome: generator,
      gridToBattery: 0,
      solarToHome: Math.max(input.solarTotal, 0),
      solarToBattery: 0,
      solarToGrid: 0,
      batteryToHome: 0,
      batteryToGrid: 0,
      nonFossilHas: false,
      nonFossilPower: null,
    };
  }
  return {
    fromGrid: input.fromGrid,
    toGrid: input.toGrid,
    gridToHome,
    gridToBattery,
    solarToHome,
    solarToBattery,
    solarToGrid,
    batteryToHome,
    batteryToGrid,
    nonFossilHas: input.nonFossilHas,
    nonFossilPower: input.nonFossilHas ? gridToHome * nonFossilFraction(input) : null,
  };
}

const nonFossilFraction = (input: SplitInput): number =>
  input.fossilEnergyConsumption
    ? computeNonFossilFromCollection(input.fossilEnergyConsumption, input.fromGrid)
        .nonFossilPercentage / 100
    : 1 - input.fossilPercentage / 100;

export const split = (family: UnitFamily, input: SplitInput): Split =>
  family === "energy" ? splitEnergy(input) : splitPower(input);
