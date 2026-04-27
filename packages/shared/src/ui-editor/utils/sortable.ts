import SortableCore from "sortablejs";
// @ts-expect-error not imported from sortable
import { AutoScroll, OnSpill } from "sortablejs/modular/sortable.core.esm";

SortableCore.mount(OnSpill);
SortableCore.mount(new AutoScroll());

// @ts-expect-error not imported from sortable
export default SortableCore as typeof Sortable;

// @ts-expect-error not imported from sortable
export type { Sortable as SortableInstance };
