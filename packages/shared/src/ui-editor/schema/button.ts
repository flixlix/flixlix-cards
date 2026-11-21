import { actionSchema } from "./_schema-base";

export const buttonSchema = [
  {
    type: "grid",
    column_min_width: "200px",
    schema: [
      { name: "name", selector: { text: {} } },
      { name: "icon", selector: { icon: {} } },
    ],
  },
  { name: "entity", selector: { entity: {} } },
  ...actionSchema,
] as const;
