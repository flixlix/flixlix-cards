import { Link } from "@tanstack/react-router";

import { heading } from "@/lib/page-meta";

import { CodeBlock, PageHeader, Prose, Section } from "./doc-primitives";
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

export function WhichCardGuide() {
  return (
    <>
      <PageHeader
        eyebrow="Guides"
        title={heading("/guides")}
        description="Six Lovelace cards live in this project. They answer different questions, and several of them belong on the same dashboard."
      />
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
      <Section title="The sensors">
        <Prose>
          <p>
            Power Flow Card Plus and Home Flow Card read instantaneous power. Give them a grid
            sensor, a solar sensor and a battery sensor, in watts or kilowatts. A state-of-charge
            sensor (a percentage) is optional and shows on the battery. Leave a sensor out and that
            part of the drawing is omitted.
          </p>
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
        <CodeBlock
          language="yaml"
          code={`type: custom:power-flow-card-plus
entities:
  grid:
    entity: sensor.grid_power
  solar:
    entity: sensor.solar_power
  battery:
    entity: sensor.battery_power
    state_of_charge: sensor.battery_soc`}
        />
        <Prose>
          <p>
            Replace the entity ids with yours. A single entity may be positive in one direction and
            negative in the other. If a line runs the wrong way, set <code>invert_state: true</code>{" "}
            on that entity, or give the card separate consumption and production entities. Both are
            documented on the{" "}
            <Link to="/power-flow-card-plus/configuration">configuration page</Link>.
          </p>
        </Prose>
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
        <CodeBlock
          language="yaml"
          code={`type: custom:home-flow-card
grid:
  entity: sensor.grid_power
solar:
  entity: sensor.solar_power
battery:
  entity: sensor.battery_power
  state_of_charge: sensor.battery_soc`}
        />
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
        <Prose>
          <p>
            <Link to="/power-flow-card-plus">Power Flow Card Plus</Link> (
            <code>custom:power-flow-card-plus</code>) is the maintained card in this set for live
            watts. The documented picture is grid, solar, battery, home and up to four individual
            devices. It has a visual editor, secondary info and templates on the circles, clickable
            entities, a power-outage state, configurable colours and flow speed, and translations.
            An auxiliary circle can show one extra reading, such as a wind share, a virtual battery
            or a gas meter. There is no water entity in its configuration reference.
          </p>
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
        <Prose>
          <p>
            <Link to="/power-flow-card-plus">Power Flow Card Plus</Link> draws the circle diagram
            used by Home Assistant's distribution card: grid, solar, battery, home and up to four
            devices you name. It does not draw an inverter front panel, and it does not have a
            per-inverter status mode. Any power sensor can feed it. Setup is the visual editor or{" "}
            <Link to="/power-flow-card-plus/examples">the examples</Link>.
          </p>
          <p>
            Pick the Sunsynk card when you want that inverter screen, including its layout of
            essential and non-essential loads. Pick Power Flow Card Plus when you want the
            distribution-card layout on a Lovelace dashboard and you have grid, solar and battery
            power sensors. <Link to="/home-flow-card">Home Flow Card</Link> is the isometric house
            for the same live sensors.
          </p>
        </Prose>
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
      <Section title="Power Flow Card Plus">
        <Prose>
          <p>
            <Link to="/power-flow-card-plus">Power Flow Card Plus</Link> takes one sensor per node,
            or a split pair of consumption and production sensors, and draws the lines itself. A
            sensor may be negative in one direction. <code>invert_state: true</code> flips one whose
            sign is backwards. Up to four individual devices get their own circles, icons and
            colours. There is a visual editor. The license is MIT.
          </p>
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
        <Prose>
          <p>
            <Link to="/power-flow-card-plus">Power Flow Card Plus</Link> shows watts from any power
            sensors you choose, updating as the sensors change. It adds up to four individual
            devices, secondary info, clickable entities, your own colours and a visual editor. It
            does not read the Energy dashboard's period totals.{" "}
            <Link to="/home-flow-card">Home Flow Card</Link> draws the same live sensors as an
            isometric house.
          </p>
          <p>
            The setup is on{" "}
            <Link to="/guides/solar-battery-power-flow">solar and battery power flow</Link>.
          </p>
        </Prose>
      </Section>
      <Section title="Period energy, with more to tune">
        <Prose>
          <p>
            <Link to="/energy-flow-card-plus">Energy Flow Card Plus</Link> is the circle diagram for
            accumulated energy over the selected period, including extra energy collections. It
            keeps the extras from Power Flow Card Plus: individual devices, colours, secondary info,
            clickable entities and the visual editor.{" "}
            <Link to="/energy-breakdown-card">Energy Breakdown Card</Link> is the donut or stacked
            bar of the same period.{" "}
            <Link to="/energy-period-selector-plus">Energy Period Selector Plus</Link> is a date
            picker for dashboards you build yourself: day, week, month, year or a custom range, with
            previous, next and compare.
          </p>
        </Prose>
      </Section>
      <GuideFooter current="/guides/energy-distribution-card-alternative" />
    </>
  );
}
