# 2. Flows always balance; a measured home exposes the difference as unaccounted

Status: accepted

## Context

A home entity with `override_state` reports home consumption directly. That reading rarely equals
what the sources balance to (sensor timing, unmetered loads, losses), and folding it into the flows
would break the balance between what sources give and sinks take.

## Decision

Flows, and the home ring drawn from them, always come from the solver and always balance. The card
may still display the measured value, but the card state carries both numbers and their difference
explicitly: `homeBalance.balanced`, `homeBalance.measured` and
`homeBalance.unaccounted = measured − balanced` (0 without a measured home). The difference is
never silently absorbed into a flow.

## Consequences

- Ring segments always sum to the full circle (or are all 0) whatever the home entity reads.
- A large `unaccounted` points at a missing or miscalibrated sensor instead of hiding it.
