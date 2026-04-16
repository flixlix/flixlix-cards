type ComputeEntityStateValue = (entityId: string) => number;
type ComputeEntityState = (entityId: string | undefined) => number | null;

type ToleranceConfig = {
  grid?: { display_zero_tolerance?: number };
  battery?: { display_zero_tolerance?: number };
  solar?: { display_zero_tolerance?: number };
  fossil_fuel_percentage?: { entity?: string };
};

type Truthy = boolean | number | string;

type EnergyGrid = {
  icon: string;
  powerOutage: {
    isOutage: boolean;
    entityGenerator?: string;
    icon: string;
  };
  state: {
    fromGrid: number | null;
    toGrid: number | null;
    toBattery: number | null;
    toHome: number | null;
  };
};

type EnergySolar = {
  has: Truthy;
  state: {
    total: number | null;
    toHome: number | null;
    toBattery: number | null;
    toGrid: number | null;
  };
};

type EnergyBattery = {
  has: Truthy;
  state: {
    fromBattery: number | null;
    toBattery: number | null;
    toGrid: number | null;
    toHome: number | null;
  };
};

type NonFossil = {
  has: Truthy;
  hasPercentage: boolean;
  state: {
    power: number | null;
  };
};

export function computeEnergyDistribution(params: {
  entities: ToleranceConfig;
  grid: EnergyGrid;
  solar: EnergySolar;
  battery: EnergyBattery;
  nonFossil: NonFossil;
  getEntityStateValue: ComputeEntityStateValue;
  getEntityState: ComputeEntityState;
}): void {
  const { entities, grid, solar, battery, nonFossil, getEntityStateValue, getEntityState } = params;

  const fromGrid = Math.max(grid.state.fromGrid ?? 0, 0);
  const toGrid = Math.max(grid.state.toGrid ?? 0, 0);
  const solarTotal = Math.max(solar.state.total ?? 0, 0);
  const batteryIn = Math.max(battery.state.toBattery ?? 0, 0);
  const batteryOut = Math.max(battery.state.fromBattery ?? 0, 0);
  const totalConsumption = Math.max(fromGrid + solarTotal + batteryOut - toGrid - batteryIn, 0);

  let remainingBatteryIn = batteryIn;
  let remainingToGrid = toGrid;
  let remainingSolar = solarTotal;
  let remainingFromGrid = fromGrid;
  let remainingBatteryOut = batteryOut;
  let remainingConsumption = totalConsumption;

  let gridToBattery = Math.max(
    0,
    Math.min(remainingBatteryIn, remainingFromGrid - remainingConsumption)
  );
  remainingBatteryIn -= gridToBattery;
  remainingFromGrid -= gridToBattery;

  const solarToBattery = Math.min(remainingSolar, remainingBatteryIn);
  remainingSolar -= solarToBattery;
  remainingBatteryIn -= solarToBattery;

  const solarToGrid = Math.min(remainingSolar, remainingToGrid);
  remainingSolar -= solarToGrid;
  remainingToGrid -= solarToGrid;

  let batteryToGrid = Math.min(remainingBatteryOut, remainingToGrid);
  remainingBatteryOut -= batteryToGrid;

  const secondGridToBattery = Math.min(remainingFromGrid, remainingBatteryIn);
  gridToBattery += secondGridToBattery;
  remainingFromGrid -= secondGridToBattery;

  const solarToHome = Math.min(remainingConsumption, remainingSolar);
  remainingConsumption -= solarToHome;

  const batteryToHome = Math.min(remainingConsumption, remainingBatteryOut);
  remainingConsumption -= batteryToHome;

  const gridToHome = Math.min(remainingConsumption, remainingFromGrid);

  const largestGridBatteryTolerance = Math.max(
    entities.grid?.display_zero_tolerance ?? 0,
    entities.battery?.display_zero_tolerance ?? 0
  );
  gridToBattery = gridToBattery > largestGridBatteryTolerance ? gridToBattery : 0;
  batteryToGrid = batteryToGrid > largestGridBatteryTolerance ? batteryToGrid : 0;

  grid.state.toBattery = gridToBattery;
  grid.state.toHome = gridToHome;
  solar.state.toBattery = solarToBattery;
  solar.state.toGrid = solarToGrid;
  solar.state.toHome = solarToHome;
  battery.state.toGrid = batteryToGrid;
  battery.state.toHome = batteryToHome;

  if (grid.powerOutage.isOutage) {
    grid.state.fromGrid = grid.powerOutage.entityGenerator
      ? Math.max(getEntityStateValue(grid.powerOutage.entityGenerator), 0)
      : 0;
    grid.state.toHome = grid.state.fromGrid;
    grid.state.toGrid = 0;
    grid.state.toBattery = 0;
    battery.state.toGrid = 0;
    battery.state.toHome = 0;
    solar.state.toGrid = 0;
    solar.state.toHome = Math.max(solar.state.total ?? 0, 0);
    solar.state.toBattery = 0;
    grid.icon = grid.powerOutage.icon;
    nonFossil.has = false;
    nonFossil.hasPercentage = false;
  }

  if (nonFossil.has) {
    const nonFossilFuelDecimal =
      1 - (getEntityState(entities.fossil_fuel_percentage?.entity) ?? 0) / 100;
    nonFossil.state.power = (grid.state.toHome ?? 0) * nonFossilFuelDecimal;
  }
}
