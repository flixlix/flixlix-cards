export function gridPower(entity?: { state?: number }): number {
  return entity?.state ?? 0;
}
