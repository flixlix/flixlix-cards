import { type IndividualObject } from "@flixlix-cards/shared/types";
import { orbitGeometry } from "./orbit";
import { orbitDeviceStyle } from "./styles";
import { type OrbitPoint } from "./orbit";
import { type IndividualSlot, type OrbitState } from "./types";

/** Degrees clockwise from straight up, from the home to the device; flipped for a feeding device. */
const arrowTurn = (node: IndividualObject, home: OrbitPoint, device: OrbitPoint) => {
  if (!node.showDirection) {
    return undefined;
  }
  const outwards = (Math.atan2(device.x - home.x, home.y - device.y) * 180) / Math.PI;
  return node.invertAnimation ? outwards + 180 : outwards;
};

/**
 * The devices on the orbit around the home. `all` is every configured device in config order,
 * which `visible` (the shown ones, in display order) is a subset of.
 */
export const computeOrbit = (
  width: number,
  visible: IndividualSlot[],
  all: IndividualObject[]
): OrbitState => {
  const geometry = orbitGeometry(width, visible.length);
  return {
    geometry,
    devices: visible.map((device, position) => {
      const point = geometry.devices[position] ?? { ...geometry.home, labelAbove: false };
      const index = all.indexOf(device.node);
      return {
        ...device,
        index,
        x: point.x,
        y: point.y,
        labelAbove: point.labelAbove,
        arrowTurn: arrowTurn(device.node, geometry.home, point),
        style: orbitDeviceStyle(device.node.field, index),
      };
    }),
  };
};
