# Home Assistant playground and e2e tests

A real Home Assistant in Docker with controllable dummy entities, one dashboard per card, and a
Playwright suite for what only a real Home Assistant can show: resources loading, the energy
period selection, the visual editors, more-info dialogs and service calls. The full scenario
matrix lives in the deterministic browser tests with a fake `hass`, not here.

## Start

```bash
pnpm hass:up      # build the cards, start HA in the background, bootstrap it
pnpm hass:down    # stop it (state is kept in .hass_dev/)
pnpm hass:reset   # stop and wipe everything HA generated (.storage, database, logs, token)
pnpm hass:logs    # follow the HA log
```

Open <http://localhost:8123> and log in as **`dev` / `dev`**. These credentials are dev-only
and committed on purpose; the instance only listens on localhost.

`pnpm start:hass` runs HA in the foreground instead; on a fresh `.hass_dev/` run
`pnpm hass:bootstrap` in a second terminal once it is up.

The bootstrap (`e2e/scripts/bootstrap.ts`, safe to re-run) completes onboarding, writes a
long-lived token to `.hass_dev/.e2e-token`, saves the energy preferences, imports hourly
statistics for the energy meters (see `e2e/src/energy-history.ts` for the totals per day:
today, yesterday and the 35 days before differ), creates the `card-editors` storage dashboard
and runs the default scenario.

**HA version:** `stable` by default. `HA_VERSION=beta pnpm hass:up` runs the beta to catch
frontend breakages early; run `pnpm hass:reset` when switching back, since a database written
by a newer HA cannot be opened by an older one.

**Live development:** compose mounts each card's `dist/` at `/local/<card>/`. Run `pnpm dev`
(`vp build --watch`) and reload the browser to pick up changes; no restart needed.

The instance runs in UTC so "today" is the same day for the imported statistics and the energy
cards; a browser in another time zone sees day boundaries shifted.

## Dashboards

| Dashboard           | What it holds                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/power-flow`       | Combined vs split entities, outage with generator, tolerance 10 W, six individuals, plus every knob and scenario |
| `/energy-flow`      | `energy-date-selection`, energy-flow-card-plus, a breakdown, and HA's own energy distribution for comparison     |
| `/energy-breakdown` | Energy donut and bar over the selected period, and a live power donut driven by the device sliders               |
| `/sortable-list`    | A list saved to `input_text.device_priority`, and a plain-key list                                               |
| `/card-editors`     | Storage dashboard the editor tests overwrite; free to play with                                                  |

Config lives in `.hass_dev/`: `configuration.yaml`, `lovelace.yaml` (resources and dashboards),
`dashboards/*.yaml`, and `packages/` with the entities.

## Driving scenarios by hand

`packages/power.yaml` defines `input_number.*` knobs and `sensor.*` power sensors that mirror
them (device class power, W). Each node has an `input_boolean.<node>_available` toggle that
makes its sensors unavailable, and `input_boolean.power_outage` raises the grid outage.
`packages/energy.yaml` holds the kWh meters for the energy cards.

`packages/scenarios.yaml` has one script per edge case; run them from the Scenarios card on
`/power-flow`. Each sets every knob, so they can run in any order:

`scenario_default`, `scenario_all_zero`, `scenario_solar_exporting`,
`scenario_battery_charging_from_grid`, `scenario_battery_discharging_to_grid`,
`scenario_grid_outage_generator`, `scenario_below_tolerance`, `scenario_negative_individual`,
`scenario_unavailable_sensors`, `scenario_more_than_four_individuals`,
`scenario_solver_regression` (import 200 / export 600 / solar 500 / discharge 150 / charge 200).

For a new case call `script.set_power_readings` with the split readings; it derives the
combined grid and battery sensors and the home.

## Tests

```bash
pnpm hass:up                                  # once; the tests expect a bootstrapped HA
pnpm --filter @flixlix-cards/e2e exec playwright install chromium   # once per Playwright version
pnpm e2e                                      # headless
pnpm e2e:ui                                   # Playwright UI mode, to watch and debug
pnpm e2e tests/card-editor.spec.ts            # one file
```

The global setup checks HA is running and logs in once, storing the tokens the frontend reads
(`e2e/.auth/`). Tests set state through the REST API and assert the card DOM through shadow
roots. They share one HA, so they run serially. Failures leave a trace in
`e2e/test-results/`; open it with `pnpm --filter @flixlix-cards/e2e exec playwright show-trace <trace.zip>`.

The e2e suite is not part of `pnpm test` or CI because it needs Docker.
