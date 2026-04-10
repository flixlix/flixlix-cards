import type { SortableConstructor, SortableInstance } from "./sortable";

let loaded: SortableConstructor;

export type { SortableInstance };
export const loadSortable = async (): Promise<SortableConstructor> => {
  if (!loaded) {
    loaded = (await import("./sortable")).default;
  }
  return loaded;
};
