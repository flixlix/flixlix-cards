import type Sortable from "sortablejs";

// The default sortablejs build already mounts the AutoScroll and OnSpill plugins.
let loaded: typeof Sortable | undefined;

export type SortableInstance = Sortable;

export const loadSortable = async (): Promise<typeof Sortable> =>
  (loaded ??= (await import("sortablejs")).default);
