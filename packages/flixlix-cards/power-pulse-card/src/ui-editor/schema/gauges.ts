export const gaugesSchema = [
  {
    type: "grid",
    name: "",
    column_min_width: "200px",
    schema: [
      {
        name: "self_consumption",
        label: "Self-consumption",
        default: false,
        selector: { boolean: {} },
      },
      {
        name: "autarky",
        label: "Autarky",
        default: false,
        selector: { boolean: {} },
      },
    ],
  },
] as const;
