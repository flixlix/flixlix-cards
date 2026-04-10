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
  return !isNaN(parseFloat(value as string)) && !isNaN(Number(value));
}

export function coerceNumber(value: unknown): number;
export function coerceNumber<D>(value: unknown, fallback: D): number | D;
export function coerceNumber(value: unknown, fallbackValue = 0) {
  return isNumberValue(value) ? Number(value) : fallbackValue;
}

export function coerceStringArray(value: unknown, separator: string | RegExp = /\s+/): string[] {
  const result: string[] = [];

  if (value != null) {
    const sourceValues = Array.isArray(value) ? value : `${value}`.split(separator);
    for (const sourceValue of sourceValues) {
      const trimmedString = `${sourceValue}`.trim();
      if (trimmedString) {
        result.push(trimmedString);
      }
    }
  }

  return result;
}
