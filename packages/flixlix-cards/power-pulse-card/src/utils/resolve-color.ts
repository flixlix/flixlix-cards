/**
 * Resolves whatever the HA `ui_color` selector hands us (palette name,
 * "default", hex/rgb string, or `{ color }` object) to a CSS color. Named
 * palette entries map to their HA CSS variable with a hex fallback so the
 * swatch matches what the user picked even on themes that don't define
 * those variables. Same approach mushroom-cards uses.
 */
const HA_NAMED_COLORS: Record<string, string> = {
  primary: "var(--primary-color, #03a9f4)",
  accent: "var(--accent-color, #ff9800)",
  red: "var(--red-color, #f44336)",
  pink: "var(--pink-color, #e91e63)",
  purple: "var(--purple-color, #926bc7)",
  "deep-purple": "var(--deep-purple-color, #6e41ab)",
  indigo: "var(--indigo-color, #3f51b5)",
  blue: "var(--blue-color, #2196f3)",
  "light-blue": "var(--light-blue-color, #03a9f4)",
  cyan: "var(--cyan-color, #00bcd4)",
  teal: "var(--teal-color, #009688)",
  green: "var(--green-color, #4caf50)",
  "light-green": "var(--light-green-color, #8bc34a)",
  lime: "var(--lime-color, #cddc39)",
  yellow: "var(--yellow-color, #ffeb3b)",
  amber: "var(--amber-color, #ffc107)",
  orange: "var(--orange-color, #ff9800)",
  "deep-orange": "var(--deep-orange-color, #ff6f22)",
  brown: "var(--brown-color, #795548)",
  "light-grey": "var(--light-grey-color, #bdbdbd)",
  grey: "var(--grey-color, #9e9e9e)",
  "dark-grey": "var(--dark-grey-color, #606060)",
  "blue-grey": "var(--blue-grey-color, #607d8b)",
  black: "var(--black-color, #000000)",
  white: "var(--white-color, #ffffff)",
  disabled: "var(--disabled-color, #bdbdbd)",
};

export function resolveColor(value: unknown, fallback: string): string {
  if (value === undefined || value === null || value === "" || value === "default") {
    return fallback;
  }
  let name: string | undefined;
  if (typeof value === "string") {
    name = value.trim();
  } else if (typeof value === "object" && value !== null && "color" in value) {
    name = (value as { color?: string }).color?.trim();
  }
  if (!name) return fallback;
  return HA_NAMED_COLORS[name] ?? name;
}
