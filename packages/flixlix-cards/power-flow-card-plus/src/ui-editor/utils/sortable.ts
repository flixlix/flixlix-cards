import type Sortable from "sortablejs";
import SortableCore, { AutoScroll, OnSpill } from "sortablejs/modular/sortable.core.esm";

SortableCore.mount(OnSpill as any, new AutoScroll() as any);

export default SortableCore as typeof Sortable;

export type SortableConstructor = typeof Sortable;
export type { Sortable as SortableInstance };
