import { Airplay, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@flixlix-cards/cn";

type ThemeMode = "light" | "dark" | "auto";

const ITEM_BASE = "size-6 rounded-full p-1.5 transition-colors";
const ITEM_ACTIVE = "bg-accent text-accent-foreground";
const ITEM_INACTIVE = "text-muted-foreground hover:text-foreground";

const MODES: { key: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { key: "light", label: "Light", Icon: Sun },
  { key: "dark", label: "Dark", Icon: Moon },
  { key: "auto", label: "System", Icon: Airplay },
];

function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "auto") return stored;
  return "light";
}

function applyThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = mode === "auto" ? (prefersDark ? "dark" : "light") : mode;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  if (mode === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
  root.style.colorScheme = resolved;
}

export default function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMode(getInitialMode());
    setMounted(true);
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
    applyThemeMode(next);
    window.localStorage.setItem("theme", next);
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
