declare module "sortablejs/modular/sortable.core.esm" {
  import type Sortable from "sortablejs";

  const SortableCore: typeof Sortable;
  export default SortableCore;

  export const AutoScroll: new () => any;
  export const OnSpill: any;
}
