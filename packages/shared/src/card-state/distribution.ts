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

/** Live power: solar feeds home first, then battery and grid; remaining import feeds home. */
function splitPower(input: SplitInput): Split {
  const { fromGrid, toGrid, solarTotal, toBattery, fromBattery, tolerance } = input;
  const largestGridBatteryTolerance = Math.max(tolerance.grid, tolerance.battery);
  const solarUnset: NodeState = solarTotal === 0 ? 0 : null;
  let solarToHome = input.solarHas ? solarTotal - toGrid - toBattery : solarUnset;
  let solarToBattery = solarUnset;
  let solarToGrid = solarUnset;
  let gridToBattery = 0;
  let batteryToGrid = 0;
  let batteryToHome = 0;

  if (solarToHome !== null && solarToHome < 0) {
    if (input.batteryHas) {
      gridToBattery = Math.abs(solarToHome);
      if (gridToBattery > fromGrid) {
        batteryToGrid = Math.min(gridToBattery - fromGrid, 0);
        gridToBattery = fromGrid;
      }
    }
    solarToHome = 0;
  } else if (toBattery > 0) {
    solarToBattery = solarTotal - (solarToHome ?? 0) - toGrid;
    gridToBattery = toBattery - solarToBattery;
  }
  gridToBattery = aboveTolerance(gridToBattery, largestGridBatteryTolerance);

  if (input.batteryHas) {
    if (input.solarHas) {
      if (batteryToGrid === 0) {
        batteryToGrid = Math.max(0, toGrid - solarTotal - toBattery - gridToBattery);
      }
      solarToBattery = toBattery - gridToBattery;
      if (tolerance.solar && tolerance.solar >= solarTotal) {
        solarToBattery = 0;
      }
    } else {
      batteryToGrid = toGrid;
    }
    batteryToGrid = aboveTolerance(batteryToGrid, largestGridBatteryTolerance);
    batteryToHome = fromBattery - batteryToGrid;
  }

  if (input.solarHas && toGrid) {
    solarToGrid = toGrid - batteryToGrid;
  }

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
