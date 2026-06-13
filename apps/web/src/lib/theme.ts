export type ThemeMode = "light" | "dark" | "auto";

const STORAGE_KEY = "theme";

/** Fired on window whenever the theme is changed programmatically. */
export const THEME_CHANGE_EVENT = "flixlix-cards:theme-change";

export function getThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "auto") return stored;
  return "light";
}

export function applyThemeMode(mode: ThemeMode) {
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

/** Applies, persists, and notifies listeners (e.g. the sidebar toggle). */
export function setThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  applyThemeMode(mode);
  window.localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent<ThemeMode>(THEME_CHANGE_EVENT, { detail: mode }));
}
