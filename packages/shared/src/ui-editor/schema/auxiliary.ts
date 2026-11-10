import localize from "@flixlix-cards/shared/i18n";
import { AUXILIARY_CONNECTIONS } from "@flixlix-cards/shared/types";
import { individualSchema } from "./individual";

const [entitySchema, ...deviceSchema] = individualSchema;

export const auxiliarySchema = [
  entitySchema,
  {
    name: "connect_to",
    selector: {
      select: {
        mode: "dropdown",
        options: AUXILIARY_CONNECTIONS.map((connection) => ({
          value: connection,
          label: localize(`editor.connect_to_${connection}`),
        })),
      },
    },
  },
  ...deviceSchema,
] as const;
