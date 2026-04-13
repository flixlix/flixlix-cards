import localize from "@flixlix-cards/i18n";
import { actionSchema, getBaseMainConfigSchema, secondaryInfoSchema } from "./_schema-base";

const mainSchema = {
  ...getBaseMainConfigSchema(),
  schema: [
    ...getBaseMainConfigSchema().schema,
    {
      name: "state_type",
      label: "State Type",
      selector: {
        select: {
          options: [
            { value: "power", label: "Power" },
            { value: "percentage", label: "Percentage" },
          ],
          mode: "dropdown",
        },
      },
    },
    {
      name: "color_value",
      label: "Color Value",
      selector: { boolean: {} },
    },
    {
      name: "color_icon",
      label: "Color Icon",
      selector: { boolean: {} },
    },
    {
      name: "display_zero",
      label: "Display Zero",
      selector: { boolean: {} },
      default: true,
    },
    {
      name: "display_zero_tolerance",
      label: "Display Zero Tolerance",
      selector: { number: { mode: "box", min: 0, max: 1000000, step: 0.1 } },
    },
    {
      name: "display_zero_state",
      label: "Display Zero State",
      selector: { boolean: {} },
      default: true,
    },
    {
      name: "unit_white_space",
      label: "Unit White Space",
      selector: { boolean: {} },
      default: true,
    },
    {
      name: "use_metadata",
      label: "Use Metadata",
      selector: { boolean: {} },
    },
  ],
};

export const nonFossilSchema = [
  {
    name: "entity",
    selector: { entity: {} },
  },
  mainSchema,
  {
    name: "color",
    label: "Color",
    selector: { color_rgb: {} },
  },
  {
    title: localize("editor.secondary_info"),
    name: "secondary_info",
    type: "expandable",
    schema: secondaryInfoSchema,
  },
  {
    title: localize("editor.action"),
    name: "",
    type: "expandable",
    schema: actionSchema,
  },
] as const;
