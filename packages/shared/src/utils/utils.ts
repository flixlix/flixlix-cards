export const round = (value: number, decimalPlaces: number): number =>
  Number(`${Math.round(Number(`${value}e${decimalPlaces}`))}e-${decimalPlaces}`);

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export function isNumberValue(value: unknown): boolean {
  // parseFloat(value) handles most of the cases we're interested in (it treats null, empty string,
  // and other non-number values as NaN, where Number just uses 0) but it considers the string
  // '123hello' to be a valid number. Therefore we also check if Number(value) is NaN.
  return !isNaN(parseFloat(String(value))) && !isNaN(Number(value));
}

export function coerceNumber(value: unknown): number;
export function coerceNumber<D>(value: unknown, fallback: D): number | D;
export function coerceNumber(value: unknown, fallbackValue = 0) {
  return isNumberValue(value) ? Number(value) : fallbackValue;
}

/** Treats `""` as missing, so `nonEmpty(x) ?? fallback` falls back for both. */
export const nonEmpty = (value: string | null | undefined): string | undefined =>
  value === null || value === undefined || value === "" ? undefined : value;

/** A sorted copy; `Array.prototype.toSorted` needs ES2023. */
export const sortedCopy = <T>(items: ReadonlyArray<T>, compare: (a: T, b: T) => number): T[] => {
  const copy = [...items];
  copy.sort(compare);
  return copy;
};
