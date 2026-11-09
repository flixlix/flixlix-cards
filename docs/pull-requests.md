# Writing a PR body

A PR body exists so a reviewer can judge the change without reconstructing it from the diff. Adapted from Matt Pocock's [`pr`](https://github.com/mattpocock/skills) skill, whose "Summary" section is Dex Horthy's [`show-me`](https://github.com/humanlayer/skills/blob/main/plugins/show-me/skills/show-me/SKILL.md).

## Template

```markdown
Closes #<issue>

## Summary

<one or two sentences on what changes for the user, then the smallest visual that shows the shape of the change>

## Evidence

- **Before:** <screenshot / failing test>
  **After:** <screenshot / passing test>

## Merge danger

**Door:** one-way | two-way
**Blast radius:** <cards, configs and layouts this can break>

## Not in this PR

<what was deliberately left out, and why>

## Checklist

<the checklist from .github/pull_request_template.md, ticked>
```

Skip preambles, keep prose brief, and use the vocabulary from [`CONTEXT.md`](../CONTEXT.md): node, flow, readings, node totals, card state, solver, slot. Drop a section only when it would be empty (a pure refactor has no "Not in this PR" worth writing). Never drop the checklist.

## Summary

Write the "what" from the issue or the user's request, not from the diff: the diff shows what the code does, the issue says what it was meant to do, and the reviewer needs the second to check the first. Credit the issue or an earlier PR it replaces.

Then pick the smallest view that makes the key point. One is usually enough, two at most.

- **A new or changed config option:** the YAML a user writes, plus one line on what every part of the card does with it.

  ```yaml
  individual:
    - entity: sensor.wallbox_garage_power
      secondary_info:
        entity: sensor.wallbox_garden_power
        sum_total: true
  ```

- **Where in the pipeline the change sits:** a diff of the data flow, so the reviewer sees that everything downstream inherits it.

  ```diff
   entity states
     readings/individual.ts
  +    add secondary_info value when sum_total
     node totals
     solver (allocation order)
     card state
     render
  ```

- **A layout or rendering change:** a diff of the Lit template tree.

  ```diff
   <home-flow-card>
     <flow-node type="home">
  +    <secondary-info />
     <flow-line from="solar" to="home">
  ```

- **A refactor or moved files:** a shallow file tree diff, one comment per line on what the file owns.

  ```diff
   packages/shared/src/card-state/
   ├── normalize.ts       # readings to node totals
  +├── readings/          # entity states to signed readings
   ├── solve.ts           # node totals to flows
  -└── individuals.ts
  ```

- **Logic:** pseudocode, or a `diff` of it when only a branch changes.

  ```diff
   reading(individual)
  -  return main
  +  if neither main nor secondary has a value
  +    return null
  +  return (main ?? 0) + (secondary ?? 0)
  ```

- **Interaction between parts** (editor, card, HA websocket, statistics): a Mermaid `sequenceDiagram`.

Show the whole block instead of a diff when most of it is new. Keep only the nodes, files, props and states the reviewer needs.

## Evidence

Show a before and an after.

1. **Screenshots** for anything visual. Take them from the `pnpm hass:up` dashboards or the visual test output. Cover what the change could plausibly affect: light and dark theme, a narrow (mobile) width, the power and the energy card when both are touched.
2. **Test runs** where there is nothing to see. Name the test that failed before the fix and passes after, as pseudocode of the scenario, not the whole file:

   ```text
   flowScenarios › "individual with sum_total"
     main 4.2 kW, secondary 3.0 kW
     before: bubble 4.2 kW   after: bubble 7.2 kW, flow to home visible
   ```

"`pnpm check && pnpm typecheck && pnpm test` pass" belongs in the checklist, not here; it proves nothing about this change.

## Merge danger

**Door.** A two-way door can be reverted in the next release without users noticing. A one-way door cannot. In this repo, one-way doors are:

- a config option name, its YAML shape or its default (users have it in their dashboards, and the UI editor writes it)
- a changed meaning for an existing option or reading, such as a sign or `invert_state` handling
- a translation key that other languages build on
- anything marked `breaking:` in the changeset

Internal refactors, styling and new opt-in options are usually two-way.

**Blast radius.** Say which cards ship the change. Anything in `packages/shared` reaches every card that imports it, so list them. Then think through what could break: existing configs that now render differently, the UI editor, layout shift on small screens or in sections/masonry views, power vs energy variants, hidden or zero nodes, sensors that are `unavailable`, updated visual baselines.

## Not in this PR

List what a reviewer might expect and will not find: a related option not added, a card not touched, an untranslated language, a follow-up issue. One line each, with the reason. This stops the review from asking for it, and makes scope creep visible.
