# 1. One flow allocation order for power and energy cards

Status: accepted

## Context

Power Flow Card Plus split live power into flows with its own branching rules; Energy Flow Card
Plus split energy totals in the order the Home Assistant energy dashboard uses. The two algorithms
gave different flows for identical numbers, and the power split depended on branch order: some
flows were assigned in several places, could go negative, or could exceed what their source
produced (e.g. exporting more solar than was generated).

## Decision

Both cards allocate node totals to flows with one solver, in the Home Assistant energy dashboard
order:

1. grid → battery, only with the import home cannot have consumed
2. solar → battery
3. solar → grid
4. battery → grid
5. grid → battery (remaining charge)
6. solar → home
7. battery → home
8. grid → home

Home consumption is `max(import + solar + discharge − export − charge, 0)`. The order is a data
table walked by one allocator that tracks what each source and sink has left; no step can give
more than its source has or take more than its sink needs.

## Consequences

- Identical totals give identical flows on both cards, and every flow is non-negative and bounded
  by its source and sink.
- Some power card edge cases change. For example, when the grid imports more than home consumes
  while the battery charges, that import is now shown charging the battery first, and export
  beyond solar production is shown coming from the battery.
