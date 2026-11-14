import { type IndividualObject } from "@flixlix-cards/shared/types";
import { orbitGeometry } from "./orbit";
import { orbitDeviceStyle } from "./styles";
import { type IndividualSlot, type OrbitState } from "./types";

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
        style: orbitDeviceStyle(device.node.field, index),
      };
    }),
  };
};
