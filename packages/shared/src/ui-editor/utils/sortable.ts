import SortableCore from "sortablejs";
// @ts-expect-error not imported from sortable
import { AutoScroll, OnSpill } from "sortablejs/modular/sortable.core.esm";

const sortableMountState = globalThis as typeof globalThis & {
  __flixlixCardsSortablePluginsMounted?: boolean;
};

const mountPluginOnce = (plugin: any): void => {
  try {
    SortableCore.mount(plugin);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("Cannot mount plugin") || !message.includes("more than once")) {
      throw err;
    }
  }
};

if (!sortableMountState.__flixlixCardsSortablePluginsMounted) {
  mountPluginOnce(OnSpill);
  mountPluginOnce(new AutoScroll());
  sortableMountState.__flixlixCardsSortablePluginsMounted = true;
}

// @ts-expect-error not imported from sortable
export default SortableCore as typeof Sortable;

// @ts-expect-error not imported from sortable
export type { Sortable as SortableInstance };
