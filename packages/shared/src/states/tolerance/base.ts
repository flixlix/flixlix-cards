export const isAboveTolerance = (value: number | null, tolerance: number): boolean =>
  value !== null && value !== 0 && Math.abs(value) >= tolerance;

export const adjustZeroTolerance = (
  value: number | null,
  tolerance: number | undefined
): number => {
  if (!value) return 0;
  if (!tolerance) return value;

  return isAboveTolerance(value, tolerance) ? value : 0;
};
