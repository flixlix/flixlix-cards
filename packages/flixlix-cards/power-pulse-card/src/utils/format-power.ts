export interface ScaledPower {
  value: number;
  unit: string;
  decimals: number;
}

export function scalePower(
  watts: number,
  options: {
    kiloThreshold?: number;
    baseDecimals?: number;
    kiloDecimals?: number;
  } = {}
): ScaledPower {
  const { kiloThreshold = 1000, baseDecimals = 0, kiloDecimals = 1 } = options;
  const abs = Math.abs(watts);
  const isKilo = abs >= kiloThreshold;
  const decimals = isKilo ? kiloDecimals : baseDecimals;
  const scaled = isKilo ? watts / 1000 : watts;
  const unit = isKilo ? "kW" : "W";
  return { value: scaled, unit, decimals };
}
