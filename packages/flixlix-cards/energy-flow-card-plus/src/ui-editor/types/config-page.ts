import { type ConfigEntities } from "@/energy-flow-card-plus-config";

export type ConfigPage = keyof ConfigEntities | "advanced" | null;
