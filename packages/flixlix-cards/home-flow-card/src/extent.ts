import { type ScreenPoint } from "./scene";

export type Box = { x: number; y: number; width: number; height: number };

/** Screen-space box the scene and its labels take, for the viewBox. */
export class Extent {
  private _box: [left: number, top: number, right: number, bottom: number] = [
    Infinity,
    Infinity,
    -Infinity,
    -Infinity,
  ];

  include([x, y]: ScreenPoint, margin = 0): void {
    const [left, top, right, bottom] = this._box;
    this._box = [
      Math.min(left, x - margin),
      Math.min(top, y - margin),
      Math.max(right, x + margin),
      Math.max(bottom, y + margin),
    ];
  }

  /**
   * The box around everything, widened on one side to pull its middle halfway towards
   * `focusX`: centring on the house alone leaves the left empty, as the labels and the grid
   * cable reach further right than the house does left.
   */
  viewBox(padding: number, focusX: number): Box {
    const [left, top, right, bottom] = this._box;
    const centerX = (focusX + (left + right) / 2) / 2;
    const half = Math.max(centerX - left, right - centerX) + padding;
    return {
      x: centerX - half,
      y: top - padding,
      width: half * 2,
      height: bottom - top + padding * 2,
    };
  }
}
