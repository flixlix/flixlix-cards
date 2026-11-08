import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";
import rule from "./ha-localize-keys.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "ha-localize-keys",
  rule,
  {
    valid: [
      'hass.localize("ui.panel.lovelace.cards.energy.energy_distribution.low_carbon");',
      'this.hass.localize("component.sensor.entity_component._.name");',
      "hass.localize(key);",
      'translate("card.label.car", language);',
    ],
    invalid: [
      { code: 'hass.localize("card.label.non_fossil_fuel_percentage");', errors: 1 },
      { code: 'this.hass.localize("editor.title");', errors: 1 },
    ],
  }
);
