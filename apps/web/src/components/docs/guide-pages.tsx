import { Link } from "@tanstack/react-router";
import { BatteryCharging, House, Percent, Sun, UtilityPole } from "lucide-react";

import { type CardConfig } from "@/components/card-preview";
import {
  breakdownDemo,
  houseDemo,
  periodDemo,
  powerDemo,
  selectorDemo,
  sortableDemo,
} from "@/components/demos";
import { heading } from "@/lib/page-meta";
import { sensor, type StateFixtures } from "@flixlix-cards/shared/preview/fake-hass";

import { PageHeader, Prose, Section } from "./doc-primitives";
import {
  type CardChoice,
  CardPicker,
  CompareTable,
  ConfigCompare,
  DemoFigure,
  EntityLists,
  type Moment,
  MomentsDemo,
  PickCards,
  type SensorTile,
  SensorTiles,
  Split,
  type Variant,
  VariantExample,
} from "./guide-visuals";
import { LiveExample } from "./live-example";
import { GUIDE_LINKS, RelatedGuides } from "./related-guides";

const OTHER_GUIDES = GUIDE_LINKS.map((entry) => entry.to);

function GuideFooter({ current }: { current: string }) {
  return (
    <Section title="More comparisons">
      <RelatedGuides paths={OTHER_GUIDES.filter((path) => path !== current)} />
    </Section>
  );
}

function External({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

const CARD_CHOICES: CardChoice[] = [
  {
    value: "power",
    label: "Live watts",
    title: "Power Flow Card Plus",
    to: "/power-flow-card-plus",
    shows:
      "What is flowing right now, in watts, between grid, solar, battery, home and up to four devices.",
    demo: { ...powerDemo, width: 400 },
  },
  {
    value: "house",
    label: "A house",
    title: "Home Flow Card",
    to: "/home-flow-card",
    shows:
      "The same live power as an isometric house: solar on the roof, the battery on the wall, the grid out at the street.",
    demo: { ...houseDemo, width: 400 },
  },
  {
    value: "energy",
    label: "A day, a week, a year",
    title: "Energy Flow Card Plus",
    to: "/energy-flow-card-plus",
    shows: "The circle diagram in kWh, added up over the period selected on the dashboard.",
    demo: periodDemo,
  },
  {
    value: "breakdown",
    label: "Shares",
    title: "Energy Breakdown Card",
    to: "/energy-breakdown-card",
    shows: "Where that period's energy went, as a donut or a stacked bar with a legend.",
    demo: breakdownDemo,
  },
  {
    value: "selector",
    label: "A date picker",
    title: "Energy Period Selector Plus",
    to: "/energy-period-selector-plus",
    shows:
      "Day, week, month, year or a custom range, plus previous, next and compare. The energy cards on the dashboard follow it.",
    demo: selectorDemo,
  },
  {
    value: "sortable",
    label: "A list to reorder",
    title: "Sortable List Card",
    to: "/sortable-list-card",
    shows:
      "A list you reorder by dragging, saved with any service call. Made for load priorities in a HEMS.",
    demo: sortableDemo,
  },
];

const LIVE_CONFIG = `type: custom:power-flow-card-plus
entities:
  grid:
    entity: sensor.grid_power
  solar:
    entity: sensor.solar_power
  battery:
    entity: sensor.battery_power
    state_of_charge: sensor.battery_soc`;

const LIVE_CARD: CardConfig = {
  type: "custom:power-flow-card-plus",
  entities: {
    grid: { entity: "sensor.grid_power" },
    solar: { entity: "sensor.solar_power" },
    battery: { entity: "sensor.battery_power", state_of_charge: "sensor.battery_soc" },
  },
};

const HOUSE_CONFIG = `type: custom:home-flow-card
grid:
  entity: sensor.grid_power
solar:
  entity: sensor.solar_power
battery:
  entity: sensor.battery_power
  state_of_charge: sensor.battery_soc`;

const liveStates = (grid: string, solar: string, battery: string, charge: string) => ({
  "sensor.grid_power": grid,
  "sensor.solar_power": solar,
  "sensor.battery_power": battery,
  "sensor.battery_soc": sensor(charge, { unit: "%" }),
});

const AFTERNOON = liveStates("-1150", "4200", "-1600", "68");
const EVENING = liveStates("0", "350", "1900", "54");
const NIGHT = liveStates("720", "0", "0", "12");

const DAY_MOMENTS: Moment[] = [
  {
    value: "afternoon",
    label: "Afternoon",
    caption: "Solar runs the home, charges the battery and sends the surplus to the grid.",
    states: AFTERNOON,
  },
  {
    value: "evening",
    label: "Evening",
    caption: "The sun is low. The battery carries the home and the grid rests.",
    states: EVENING,
  },
  {
    value: "night",
    label: "Night",
    caption: "No solar and an almost empty battery, so the home runs on the grid.",
    states: NIGHT,
  },
];

const SIGN_MOMENTS: Moment[] = [
  {
    value: "export",
    label: "Exporting",
    caption:
      "Grid and battery are negative: the card draws an export to the grid and a charging battery.",
    states: AFTERNOON,
  },
  {
    value: "discharge",
    label: "Discharging",
    caption:
      "The battery sensor turned positive, so its line now runs from the battery to the home.",
    states: EVENING,
  },
  {
    value: "import",
    label: "Importing",
    caption: "The grid sensor is positive: the same line now carries power in from the grid.",
    states: NIGHT,
  },
];

const SENSORS: SensorTile[] = [
  {
    icon: UtilityPole,
    name: "Grid",
    unit: "W or kW",
    note: "One sensor that goes negative when exporting, or separate import and export sensors.",
  },
  {
    icon: Sun,
    name: "Solar",
    unit: "W or kW",
    note: "What the panels produce right now.",
  },
  {
    icon: BatteryCharging,
    name: "Battery",
    unit: "W or kW",
    note: "One signed sensor, or separate charge and discharge sensors.",
  },
  {
    icon: Percent,
    name: "State of charge",
    unit: "%",
    note: "Optional. Shows on the battery.",
  },
  {
    icon: House,
    name: "Home",
    unit: "W or kW",
    note: "Optional. Power Flow Card Plus can work it out from the other flows.",
  },
];

const BACKWARDS_STATES: StateFixtures = {
  "sensor.grid_power": "800",
  "sensor.solar_power": "2000",
};

const INVERT_VARIANTS: Variant[] = [
  {
    value: "as-reported",
    label: "As reported",
    caption:
      "This meter reports export as a positive number. The card reads the 800 W as an import and the home looks like it uses 2.8 kW.",
    code: `type: custom:power-flow-card-plus
entities:
  grid:
    entity: sensor.grid_power
  solar:
    entity: sensor.solar_power`,
  },
  {
    value: "inverted",
    label: "invert_state: true",
    caption:
      "The same reading, inverted: 800 W of the solar goes out to the grid and the home uses 1.2 kW.",
    code: `type: custom:power-flow-card-plus
entities:
  grid:
    entity: sensor.grid_power
    invert_state: true
  solar:
    entity: sensor.solar_power`,
  },
];

const ORIGINAL_CONFIG = `type: custom:power-flow-card
entities:
  grid: sensor.grid_power
  solar: sensor.solar_power
  battery: sensor.battery_power
  battery_charge: sensor.battery_soc
inverted_entities: battery, grid`;

const PLUS_CONFIG = `type: custom:power-flow-card-plus
entities:
  grid:
    entity: sensor.grid_power
    invert_state: true
  solar:
    entity: sensor.solar_power
  battery:
    entity: sensor.battery_power
    state_of_charge: sensor.battery_soc
    invert_state: true`;

const TESLA_FLOW_ENTITIES = [
  "generation_to_grid_entity",
  "generation_to_battery_entity",
  "generation_to_house_entity",
  "grid_to_battery_entity",
  "grid_to_house_entity",
  "battery_to_grid_entity",
  "battery_to_house_entity",
  "appliance1_consumption_entity",
  "appliance2_consumption_entity",
];

const PLUS_NODE_ENTITIES = ["entities.grid", "entities.solar", "entities.battery"];

export function WhichCardGuide() {
  return (
    <>
      <PageHeader
        eyebrow="Guides"
        title={heading("/guides")}
        description="Six Lovelace cards live in this project. They answer different questions, and several of them belong on the same dashboard."
      />
      <CardPicker choices={CARD_CHOICES} />
      <div className="max-w-3xl overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-medium">Card</th>
              <th className="px-4 py-3 font-medium">What it shows</th>
              <th className="px-4 py-3 font-medium">Use it when</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="px-4 py-3 font-medium">
                <Link
                  to="/power-flow-card-plus"
                  className="decoration-solar underline-offset-4 hover:underline"
                >
                  Power Flow Card Plus
                </Link>
              </td>
              <td className="px-4 py-3">
                Live power, in watts, between grid, solar, battery, home and up to four devices.
              </td>
              <td className="px-4 py-3">
                You want the circle diagram of what is flowing right now.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium">
                <Link
                  to="/home-flow-card"
                  className="decoration-solar underline-offset-4 hover:underline"
                >
                  Home Flow Card
                </Link>
              </td>
              <td className="px-4 py-3">
                The same live power, drawn as an isometric house. <code>mode: energy</code> switches
                it to the dashboard's period.
              </td>
              <td className="px-4 py-3">
                You want a house: solar on the roof, the battery on the wall, the grid out at the
                street.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium">
                <Link
                  to="/energy-flow-card-plus"
                  className="decoration-solar underline-offset-4 hover:underline"
                >
                  Energy Flow Card Plus
                </Link>
              </td>
              <td className="px-4 py-3">
                Accumulated energy, in kWh, for the period selected on the dashboard.
              </td>
              <td className="px-4 py-3">
                You want the circle diagram for a day, a week or a year.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium">
                <Link
                  to="/energy-breakdown-card"
                  className="decoration-solar underline-offset-4 hover:underline"
                >
                  Energy Breakdown Card
                </Link>
              </td>
              <td className="px-4 py-3">
                A donut or stacked bar of where that period's energy went.
              </td>
              <td className="px-4 py-3">You want shares and a legend more than a flow diagram.</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium">
                <Link
                  to="/energy-period-selector-plus"
                  className="decoration-solar underline-offset-4 hover:underline"
                >
                  Energy Period Selector Plus
                </Link>
              </td>
              <td className="px-4 py-3">
                Day, week, month, year or a custom range, plus previous, next and compare.
              </td>
              <td className="px-4 py-3">
                The energy cards should follow a date picker on a dashboard you built yourself.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium">
                <Link
                  to="/sortable-list-card"
                  className="decoration-solar underline-offset-4 hover:underline"
                >
                  Sortable List Card
                </Link>
              </td>
              <td className="px-4 py-3">
                A list you reorder by dragging. The new order is saved with any service call.
              </td>
              <td className="px-4 py-3">
                A HEMS needs a load-priority list, or any other order you want to persist.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Prose className="mt-8">
        <p>
          Live power cards read power sensors directly. Period cards add up energy sensors the same
          way Home Assistant's Energy Distribution card does, so those sensors need long-term
          statistics.{" "}
          <Link to="/guides/solar-battery-power-flow">Solar and battery power flow</Link> walks
          through the live setup.{" "}
          <Link to="/guides/energy-distribution-card-alternative">
            The Energy Distribution alternative
          </Link>{" "}
          covers the built-in card.
        </p>
      </Prose>
      <GuideFooter current="/guides" />
    </>
  );
}

export function SolarBatteryGuide() {
  return (
    <>
      <PageHeader
        eyebrow="Guides"
        title={heading("/guides/solar-battery-power-flow")}
        description="Live watts, from the power sensors you already have. The card draws the lines. You do not need the Energy dashboard for this."
      />
      <MomentsDemo
        legend="Time of day"
        config={LIVE_CARD}
        moments={DAY_MOMENTS}
        className="mb-12"
      />
      <Section title="The sensors">
        <Prose>
          <p>
            Power Flow Card Plus and Home Flow Card read instantaneous power. Give them a grid
            sensor, a solar sensor and a battery sensor, in watts or kilowatts. Leave a sensor out
            and that part of the drawing is omitted.
          </p>
        </Prose>
        <SensorTiles sensors={SENSORS} />
        <Prose>
          <p>
            Home consumption can be its own sensor. With Power Flow Card Plus you can also leave it
            unset and let the card work from the other flows. Individual devices, up to four of
            them, are extra circles on Power Flow Card Plus. Home Flow Card draws an optional car
            and heat pump, and it does not draw arbitrary individual devices.
          </p>
        </Prose>
      </Section>
      <Section title="Install and add the card">
        <Prose>
          <p>
            On Home Assistant 2026.11 and newer, install{" "}
            <Link to="/power-flow-card-plus/installation">
              Power Flow Card Plus from the Marketplace
            </Link>
            . Before that, install it from HACS. It is in the default catalog. Add the card on a
            dashboard and pick the sensors in the visual editor, or paste a config:
          </p>
        </Prose>
        <LiveExample code={LIVE_CONFIG} states={AFTERNOON} />
        <Prose>
          <p>
            Replace the entity ids with yours. A single entity may be positive in one direction and
            negative in the other.
          </p>
        </Prose>
      </Section>
      <Section title="When a line runs the wrong way">
        <Prose>
          <p>
            Set <code>invert_state: true</code> on that entity, or give the card separate
            consumption and production entities. Both are documented on the{" "}
            <Link to="/power-flow-card-plus/configuration">configuration page</Link>.
          </p>
        </Prose>
        <VariantExample
          legend="Grid sensor sign"
          variants={INVERT_VARIANTS}
          states={BACKWARDS_STATES}
        />
      </Section>
      <Section title="The same sensors, as a house">
        <Prose>
          <p>
            <Link to="/home-flow-card">Home Flow Card</Link> is the isometric house power card.
            Solar sits on the roof, the battery on the wall, and the grid cable runs out to the
            street. It reads the same kind of power sensors, with the keys at the top level of the
            config:
          </p>
        </Prose>
        <LiveExample code={HOUSE_CONFIG} states={AFTERNOON} width={440} />
        <Prose>
          <p>
            Set <code>mode: energy</code> when you want the house to show energy for the dashboard's
            selected period. For kilowatt-hours on the circle diagram, use{" "}
            <Link to="/energy-flow-card-plus">Energy Flow Card Plus</Link> with{" "}
            <Link to="/energy-period-selector-plus">Energy Period Selector Plus</Link>. Those read
            energy sensors and need long-term statistics, the same requirement as the built-in
            energy cards.
          </p>
        </Prose>
      </Section>
      <GuideFooter current="/guides/solar-battery-power-flow" />
    </>
  );
}

export function VersusOriginalGuide() {
  return (
    <>
      <PageHeader
        eyebrow="Guides"
        title={heading("/guides/power-flow-card-plus-vs-power-flow-card")}
        description="Both are Lovelace cards that draw live power in the style of Home Assistant's Energy Distribution card. They are not the same config."
      />
      <Section title="The original Power Flow Card">
        <Prose>
          <p>
            <External href="https://github.com/ulic75/power-flow-card">
              ulic75/power-flow-card
            </External>{" "}
            says it is archived and has been unmaintained for several years, and it points people at
            Flixlix Cards. Its own scope is to display current power, gas and water in a layout that
            matches the official Energy Distribution card, and to leave features outside that scope
            out.
          </p>
          <p>
            The entities it documents are grid, battery, battery charge, solar, gas and water. Grid
            and battery accept one bidirectional sensor or separate consumption and production
            sensors. A comma-separated <code>inverted_entities</code> list flips the sign. The card
            type is <code>custom:power-flow-card</code>.
          </p>
        </Prose>
      </Section>
      <Section title="Power Flow Card Plus">
        <Split
          aside={
            <DemoFigure
              demo={powerDemo}
              caption="Grid, solar, battery and home, with an EV and a heat pump as individual devices."
            />
          }
        >
          <Prose>
            <p>
              <Link to="/power-flow-card-plus">Power Flow Card Plus</Link> (
              <code>custom:power-flow-card-plus</code>) is the maintained card in this set for live
              watts. The documented picture is grid, solar, battery, home and up to four individual
              devices. It has a visual editor, secondary info and templates on the circles,
              clickable entities, a power-outage state, configurable colours and flow speed, and
              translations. An auxiliary circle can show one extra reading, such as a wind share, a
              virtual battery or a gas meter. There is no water entity in its configuration
              reference.
            </p>
          </Prose>
        </Split>
      </Section>
      <Section title="At a glance">
        <CompareTable
          columns={["Power Flow Card", "Power Flow Card Plus"]}
          rows={[
            { label: "Status", left: "Archived, unmaintained", right: "Maintained" },
            {
              label: "Card type",
              left: <code>custom:power-flow-card</code>,
              right: <code>custom:power-flow-card-plus</code>,
            },
            {
              label: "Documented entities",
              left: "Grid, battery, battery charge, solar, gas, water",
              right:
                "Grid, solar, battery, home, up to four individual devices, one auxiliary circle",
            },
            {
              label: "A sensor with the sign backwards",
              left: (
                <>
                  One <code>inverted_entities</code> list
                </>
              ),
              right: (
                <>
                  <code>invert_state: true</code> on the entity
                </>
              ),
            },
            {
              label: "Battery percentage",
              left: <code>battery_charge</code>,
              right: <code>state_of_charge</code>,
            },
          ]}
        />
      </Section>
      <Section title="Moving a config across">
        <ConfigCompare
          sides={[
            {
              title: "power-flow-card",
              code: ORIGINAL_CONFIG,
              note: "The sensor id sits directly on the entity key.",
            },
            {
              title: "power-flow-card-plus",
              code: PLUS_CONFIG,
              note: (
                <>
                  The sensor moves under <code>entity</code>, next to that entity's own options.
                </>
              ),
            },
          ]}
        />
        <Prose>
          <p>
            A config from the original card does not paste across. The original puts a sensor id
            directly on <code>entities.grid</code> and uses <code>battery_charge</code>. Plus nests
            the sensor under <code>entity</code> and uses <code>state_of_charge</code>. The{" "}
            <Link to="/power-flow-card-plus/examples">examples</Link> are the starting point, and{" "}
            <code>invert_state: true</code> on an entity replaces the old inverted-entities list
            when a sensor's sign is backwards.
          </p>
          <p>
            <Link to="/home-flow-card">Home Flow Card</Link> draws those same live sensors as an
            isometric house. <Link to="/energy-flow-card-plus">Energy Flow Card Plus</Link> is the
            period-energy version of the circle diagram.
          </p>
        </Prose>
      </Section>
      <GuideFooter current="/guides/power-flow-card-plus-vs-power-flow-card" />
    </>
  );
}

export function VersusSunsynkGuide() {
  return (
    <>
      <PageHeader
        eyebrow="Guides"
        title={heading("/guides/power-flow-card-plus-vs-sunsynk")}
        description="Both are HACS Lovelace cards for live power. They draw different pictures and expect different kinds of detail from your sensors."
      />
      <Section title="Sunsynk Power Flow Card">
        <Prose>
          <p>
            <External href="https://github.com/slipx06/sunsynk-power-flow-card">
              slipx06/sunsynk-power-flow-card
            </External>{" "}
            describes itself as an animated card that emulates the power flow shown on a Sunsynk
            inverter screen. Its README says it can display data from Sunsynk, Deye, Solis, Lux,
            FoxESS, Goodwe, Huawei and others, as long as the required sensors exist. It documents
            three styles, compact, lite and full, plus inverter-specific status messages, daily
            totals, MPPT labels and optional essential, non-essential and AUX loads. Its docs are at{" "}
            <External href="https://slipx06.github.io/sunsynk-power-flow-card/">
              slipx06.github.io/sunsynk-power-flow-card
            </External>
            .
          </p>
        </Prose>
      </Section>
      <Section title="Power Flow Card Plus">
        <Split
          aside={
            <DemoFigure
              demo={powerDemo}
              caption="The circle diagram: any power sensors, plus the devices you name."
            />
          }
        >
          <Prose>
            <p>
              <Link to="/power-flow-card-plus">Power Flow Card Plus</Link> draws the circle diagram
              used by Home Assistant's distribution card: grid, solar, battery, home and up to four
              devices you name. It does not draw an inverter front panel, and it does not have a
              per-inverter status mode. Any power sensor can feed it. Setup is the visual editor or{" "}
              <Link to="/power-flow-card-plus/examples">the examples</Link>.
            </p>
          </Prose>
        </Split>
      </Section>
      <Section title="Which one to pick">
        <PickCards
          picks={[
            {
              title: "Sunsynk Power Flow Card",
              points: [
                "You want the power flow as a Sunsynk inverter screen shows it.",
                "You want its layout of essential, non-essential and AUX loads.",
                "You want inverter status messages, daily totals or MPPT labels.",
              ],
              link: (
                <External href="https://slipx06.github.io/sunsynk-power-flow-card/">
                  Sunsynk Power Flow Card docs
                </External>
              ),
            },
            {
              title: "Power Flow Card Plus",
              points: [
                "You want the distribution-card layout on a Lovelace dashboard.",
                "You have grid, solar and battery power sensors, from any integration.",
                "You want up to four devices of your own as circles.",
              ],
              link: <Link to="/power-flow-card-plus/examples">Power Flow Card Plus examples</Link>,
            },
          ]}
        />
        <Prose>
          <p>
            <Link to="/home-flow-card">Home Flow Card</Link> is the isometric house for the same
            live sensors.
          </p>
        </Prose>
        <DemoFigure demo={houseDemo} width={440} caption="Home Flow Card on a sunny afternoon." />
      </Section>
      <GuideFooter current="/guides/power-flow-card-plus-vs-sunsynk" />
    </>
  );
}

export function VersusTeslaGuide() {
  return (
    <>
      <PageHeader
        eyebrow="Guides"
        title={heading("/guides/power-flow-card-plus-vs-tesla-style")}
        description="Both show live solar, battery, grid and house power on a Lovelace dashboard. The graphics differ, and so does the sensor each line needs."
      />
      <Section title="Tesla Style Solar Power Card">
        <Prose>
          <p>
            <External href="https://github.com/reptilex/tesla-style-solar-power-card">
              reptilex/tesla-style-solar-power-card
            </External>{" "}
            describes a Tesla-style graphic: four main bubbles (grid, generation, house, battery)
            and two optional appliances. Its README says the bubble numbers come from the flows you
            define, that every flow sensor has to be a positive value, and that there are seven main
            flows plus two appliance flows, each its own entity. An extra entity can sit on a
            bubble, and a battery state-of-charge entity changes the battery icon. The README
            includes a long template-sensor walkthrough for the Tesla Powerwall integration. The
            license is Apache 2.0.
          </p>
        </Prose>
      </Section>
      <Section title="What you wire up">
        <EntityLists
          lists={[
            {
              title: "Tesla Style Solar Power Card",
              summary: "One positive sensor per flow, so one per line on the card.",
              entities: TESLA_FLOW_ENTITIES,
            },
            {
              title: "Power Flow Card Plus",
              summary: "One sensor per node. The card works out the lines between them.",
              entities: PLUS_NODE_ENTITIES,
            },
          ]}
        />
      </Section>
      <Section title="Power Flow Card Plus">
        <Prose>
          <p>
            <Link to="/power-flow-card-plus">Power Flow Card Plus</Link> takes one sensor per node,
            or a split pair of consumption and production sensors, and draws the lines itself. A
            sensor may be negative in one direction. <code>invert_state: true</code> flips one whose
            sign is backwards. Up to four individual devices get their own circles, icons and
            colours. There is a visual editor. The license is MIT.
          </p>
        </Prose>
        <MomentsDemo legend="Reading" config={LIVE_CARD} moments={SIGN_MOMENTS} />
        <Prose>
          <p>
            You do not create a template per arrow. If your integration already exposes grid, solar
            and battery power, those entities are enough to start; the{" "}
            <Link to="/guides/solar-battery-power-flow">solar and battery setup</Link> shows the
            config. The Tesla-style card is the one to use when you specifically want that bubble
            graphic and you already have, or are willing to build, a positive sensor for each flow.
            Its Powerwall section is a reason to read that README if that integration is what you
            have.
          </p>
        </Prose>
      </Section>
      <GuideFooter current="/guides/power-flow-card-plus-vs-tesla-style" />
    </>
  );
}

export function DistributionAlternativeGuide() {
  return (
    <>
      <PageHeader
        eyebrow="Guides"
        title={heading("/guides/energy-distribution-card-alternative")}
        description="The built-in card stays the official one. These cards cover the cases where you want live watts, or the same period view with more control."
      />
      <Section title="What the built-in card shows">
        <Prose>
          <p>
            Home Assistant's{" "}
            <External href="https://www.home-assistant.io/dashboards/energy/#energy-distribution">
              Energy Distribution card
            </External>{" "}
            shows energy totals from the Energy dashboard for the selected period. The companion{" "}
            <External href="https://www.home-assistant.io/dashboards/energy/#energy-date-picker">
              energy date picker
            </External>{" "}
            chooses that period. Both are part of Home Assistant. The period cards in this project
            read the same kind of energy data, so the Energy dashboard and long-term statistics
            still matter for them.
          </p>
        </Prose>
      </Section>
      <Section title="Live power">
        <Split
          aside={
            <DemoFigure demo={powerDemo} caption="Power Flow Card Plus: watts, as they flow." />
          }
        >
          <Prose>
            <p>
              <Link to="/power-flow-card-plus">Power Flow Card Plus</Link> shows watts from any
              power sensors you choose, updating as the sensors change. It adds up to four
              individual devices, secondary info, clickable entities, your own colours and a visual
              editor. It does not read the Energy dashboard's period totals.{" "}
              <Link to="/home-flow-card">Home Flow Card</Link> draws the same live sensors as an
              isometric house.
            </p>
            <p>
              The setup is on{" "}
              <Link to="/guides/solar-battery-power-flow">solar and battery power flow</Link>.
            </p>
          </Prose>
        </Split>
      </Section>
      <Section title="Period energy, with more to tune">
        <Split
          aside={
            <DemoFigure
              demo={periodDemo}
              caption="Energy Period Selector Plus driving Energy Flow Card Plus. Pick a period."
            />
          }
        >
          <Prose>
            <p>
              <Link to="/energy-flow-card-plus">Energy Flow Card Plus</Link> is the circle diagram
              for accumulated energy over the selected period, including extra energy collections.
              It keeps the extras from Power Flow Card Plus: individual devices, colours, secondary
              info, clickable entities and the visual editor.
            </p>
            <p>
              <Link to="/energy-period-selector-plus">Energy Period Selector Plus</Link> is a date
              picker for dashboards you build yourself: day, week, month, year or a custom range,
              with previous, next and compare.
            </p>
          </Prose>
        </Split>
      </Section>
      <Section title="Where the energy went">
        <Split
          aside={
            <DemoFigure
              demo={breakdownDemo}
              caption="Energy Breakdown Card under the same selector."
            />
          }
        >
          <Prose>
            <p>
              <Link to="/energy-breakdown-card">Energy Breakdown Card</Link> is the donut or stacked
              bar of the same period.
            </p>
          </Prose>
        </Split>
      </Section>
      <GuideFooter current="/guides/energy-distribution-card-alternative" />
    </>
  );
}
