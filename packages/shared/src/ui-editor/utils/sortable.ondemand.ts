import type SortableCore from "./sortable";
import type { SortableInstance } from "./sortable";

let loaded: typeof SortableCore;

export type { SortableInstance };
export const loadSortable = async (): Promise<typeof SortableCore> => {
  if (!loaded) {
    loaded = (await import("./sortable")).default;
  }
  return loaded;
};
