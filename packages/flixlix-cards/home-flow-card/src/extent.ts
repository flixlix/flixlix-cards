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

  /** Points the box must hold without being centred on them, as `require` keeps them. */
  private _required: [left: number, right: number] = [Infinity, -Infinity];

  /** Points the centred box widens to on their own side only, as `extend` keeps them. */
  private _extended: [left: number, right: number] = [Infinity, -Infinity];

  clone(): Extent {
    const copy = new Extent();
    copy._box = [...this._box];
    copy._required = [...this._required];
    copy._extended = [...this._extended];
    return copy;
  }

  /**
   * Widens the box to hold `x` on that side alone, after centring and without its padding: a point
   * in the room centring already leaves costs nothing, and one past it widens the box by only its
   * overhang.
   */
  extend(x: number, margin = 0): void {
    const [left, right] = this._extended;
    this._extended = [Math.min(left, x - margin), Math.max(right, x + margin)];
  }

  /** Widens the box to hold `x`, without moving the middle the box is centred on. */
  require(x: number, margin = 0): void {
    const [left, right] = this._required;
    this._required = [Math.min(left, x - margin), Math.max(right, x + margin)];
  }

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
   * The box around everything, widened on one side to pull its middle `pull` of halfway towards
   * `focusX`: centring on the house alone leaves the left empty, as the labels and the grid
   * cable reach further right than the house does left.
   */
  viewBox(padding: number, focusX: number, pull = 1): Box {
    const [left, top, right, bottom] = this._box;
    const middle = (left + right) / 2;
    const centerX = middle + ((focusX - middle) / 2) * pull;
    const [requiredLeft, requiredRight] = this._required;
    const half =
      Math.max(centerX - Math.min(left, requiredLeft), Math.max(right, requiredRight) - centerX) +
      padding;
    const [extendedLeft, extendedRight] = this._extended;
    const x = Math.min(centerX - half, extendedLeft);
    return {
      x,
      y: top - padding,
      width: Math.max(centerX + half, extendedRight) - x,
      height: bottom - top + padding * 2,
    };
  }
}
