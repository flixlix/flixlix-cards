import { Airplay, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import {
  applyThemeMode,
  getThemeMode,
  setThemeMode,
  THEME_CHANGE_EVENT,
  type ThemeMode,
} from "#/lib/theme";
import { cn } from "@flixlix-cards/cn";

const ITEM_BASE =
  "size-6 cursor-pointer rounded-full p-1.5 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring";
const ITEM_ACTIVE = "bg-accent text-accent-foreground";
const ITEM_INACTIVE = "text-muted-foreground hover:text-foreground";

const MODES: { key: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { key: "light", label: "Light", Icon: Sun },
  { key: "dark", label: "Dark", Icon: Moon },
  { key: "auto", label: "System", Icon: Airplay },
];

// Stay in sync when the theme is changed elsewhere (e.g. command menu).
function subscribeToThemeChange(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

export default function ThemeToggle({ className }: { className?: string }) {
  const active = useSyncExternalStore<ThemeMode | null>(
    subscribeToThemeChange,
    getThemeMode,
    () => null
  );

  useEffect(() => {
    if (active !== "auto") {
      return undefined;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeMode("auto");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [active]);

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      data-theme-toggle=""
      className={cn(
        "border-border bg-background inline-flex items-center gap-0.5 rounded-full border p-1",
        className
      )}
    >
      {MODES.map(({ key, label, Icon }) => (
        <label
          key={key}
          title={label}
          className={cn(ITEM_BASE, active === key ? ITEM_ACTIVE : ITEM_INACTIVE)}
        >
          <input
            type="radio"
            name="theme"
            value={key}
            aria-label={label}
            checked={active === key}
            onChange={() => setThemeMode(key)}
            className="sr-only"
          />
          <Icon className="size-full" fill="currentColor" />
        </label>
      ))}
    </div>
  );
}
