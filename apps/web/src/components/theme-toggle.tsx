import { Airplay, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import {
  applyThemeMode,
  getThemeMode,
  setThemeMode,
  THEME_CHANGE_EVENT,
  type ThemeMode,
} from "#/lib/theme";
import { cn } from "@flixlix-cards/cn";

const ITEM_BASE = "size-6 rounded-full p-1.5 transition-colors";
const ITEM_ACTIVE = "bg-accent text-accent-foreground";
const ITEM_INACTIVE = "text-muted-foreground hover:text-foreground";

const MODES: { key: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { key: "light", label: "Light", Icon: Sun },
  { key: "dark", label: "Dark", Icon: Moon },
  { key: "auto", label: "System", Icon: Airplay },
];

export default function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMode(getThemeMode());
    setMounted(true);
    // Stay in sync when the theme is changed elsewhere (e.g. command menu).
    const onThemeChange = (e: Event) => setMode((e as CustomEvent<ThemeMode>).detail);
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
  }, []);

  useEffect(() => {
    if (mode !== "auto") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeMode("auto");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode]);

  function selectMode(next: ThemeMode) {
    setMode(next);
    setThemeMode(next);
  }

  const active = mounted ? mode : null;

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
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={active === key}
          aria-label={label}
          title={label}
          onClick={() => selectMode(key)}
          className={cn(ITEM_BASE, active === key ? ITEM_ACTIVE : ITEM_INACTIVE)}
        >
          <Icon className="size-full" fill="currentColor" />
        </button>
      ))}
    </div>
  );
}
